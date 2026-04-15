const { randomUUID } = require('crypto');
const EventEmitter = require('events');
const Donor = require('../models/Donor');
const MessageLog = require('../models/MessageLog');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const messageQueue = require('../utils/messageQueue');
const logger = require('../utils/logger');

// In-memory job progress store
// Shape: { total: N, completed: N, done: boolean, results: [{donorId, status}] }
const jobProgress = new Map();

// Event bus — workers emit `jobId` events; SSE handlers listen for them
const progressEmitter = new EventEmitter();
progressEmitter.setMaxListeners(200);

// Auto-remove a finished job after 5 minutes
const _scheduleCleanup = (jobId) =>
  setTimeout(() => jobProgress.delete(jobId), 5 * 60 * 1000);

// Retry-with-backoff for announcement messages (mirrors paymentController's sendWithRetry)
const _sendAnnouncementWithRetry = async (payload, logId, maxAttempts = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await MessageLog.findByIdAndUpdate(logId, { $inc: { attempts: 1 } });
      const result = await sendWhatsAppMessage(payload);

      await MessageLog.findByIdAndUpdate(logId, {
        status: 'sent',
        whatsappMessageId: result.messageId,
        sentAt: new Date(),
        errorMessage: null,
      });

      logger.info('Announcement sent', { logId, attempt, phone: payload.phone });
      return 'sent';
    } catch (err) {
      lastError = err;
      logger.warn('Announcement attempt failed', { logId, attempt, error: err.message });

      if (err.permanent) break;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  await MessageLog.findByIdAndUpdate(logId, {
    status: 'failed',
    errorMessage: lastError?.message,
  });

  logger.error('Announcement failed after all attempts', { logId, error: lastError?.message });
  return 'failed';
};

// ─── POST /api/messages/send-bulk ────────────────────────────────────────────
// Body: { donorIds: string[], message: string }
const sendBulk = async (req, res, next) => {
  try {
    const { donorIds, message } = req.body;

    if (!Array.isArray(donorIds) || donorIds.length === 0) {
      return res.status(400).json({ success: false, message: 'donorIds must be a non-empty array' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }

    const donors = await Donor.find({ _id: { $in: donorIds }, isActive: true }).lean();

    if (donors.length === 0) {
      return res.status(404).json({ success: false, message: 'No active donors found for given IDs' });
    }

    const jobId = randomUUID();
    const total = donors.length;

    // Pre-create MessageLog entries (one per donor) before queuing
    const logs = await MessageLog.insertMany(
      donors.map((d) => ({
        donorId: d._id,
        templateName: 'general_announcement',
        status: 'pending',
        jobId,
      }))
    );

    // Initialise progress state before the first job runs
    jobProgress.set(jobId, { total, completed: 0, done: false, results: [] });

    // Enqueue one job per donor into the shared rate-limited queue
    donors.forEach((donor, i) => {
      const logId = logs[i]._id;
      messageQueue.add(async () => {
        const status = await _sendAnnouncementWithRetry(
          {
            phone: donor.phone,
            donorName: donor.name,
            templateName: 'general_announcement',
            templateParams: { '1': message.trim() },
          },
          logId
        );

        // Update in-memory progress
        const state = jobProgress.get(jobId);
        if (state) {
          const event = { donorId: donor._id.toString(), status };
          state.results.push(event);
          state.completed++;
          if (state.completed >= state.total) {
            state.done = true;
            _scheduleCleanup(jobId);
          }
          progressEmitter.emit(jobId, event);
        }
      });
    });

    logger.info('Bulk announcement enqueued', { jobId, total, adminId: req.admin._id });

    res.json({ success: true, data: { jobId, total } });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/messages/progress/:jobId  (Server-Sent Events) ─────────────────
const getProgress = (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
  res.flushHeaders();

  const send = (eventName, data) => {
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // Keep-alive ping every 15 s (prevents proxy timeouts)
  const ping = setInterval(() => res.write(': ping\n\n'), 15000);

  const state = jobProgress.get(jobId);
  if (!state) {
    send('error', { message: 'Job not found' });
    clearInterval(ping);
    res.end();
    return;
  }

  // Flush results that completed before this connection opened
  for (const event of state.results) {
    send('progress', event);
  }

  if (state.done) {
    send('done', { jobId });
    clearInterval(ping);
    res.end();
    return;
  }

  const onProgress = (event) => {
    send('progress', event);
    const current = jobProgress.get(jobId);
    if (current?.done) {
      send('done', { jobId });
      cleanup();
    }
  };

  const cleanup = () => {
    clearInterval(ping);
    progressEmitter.off(jobId, onProgress);
    if (!res.writableEnded) res.end();
  };

  progressEmitter.on(jobId, onProgress);
  req.on('close', cleanup);
};

module.exports = { sendBulk, getProgress };
