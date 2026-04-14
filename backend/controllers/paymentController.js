const mongoose = require('mongoose');
const Donor = require('../models/Donor');
const MessageLog = require('../models/MessageLog');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const logger = require('../utils/logger');

// Send with up to `maxAttempts` retries (simple exponential backoff)
const sendWithRetry = async (payload, logId, maxAttempts = 3) => {
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

      logger.info('WhatsApp message sent', { logId, attempt, ...payload });
      return;
    } catch (err) {
      lastError = err;
      logger.warn('WhatsApp attempt failed', { logId, attempt, error: err.message });

      // Permanent errors (e.g. bad auth) — no point retrying
      if (err.permanent) break;

      // Wait before retrying: 2s, 4s, 8s...
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  await MessageLog.findByIdAndUpdate(logId, {
    status: 'failed',
    errorMessage: lastError?.message,
  });

  logger.error('WhatsApp message failed after all attempts', { logId, error: lastError?.message });
};

const markPaid = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { donorId, amount, language } = req.body;

    const donor = await Donor.findOneAndUpdate(
      { _id: donorId, isActive: true },
      {
        $inc: { totalAmount: amount },
        lastPayment: amount,
        lastPaidAt: new Date(),
      },
      { new: true, session, runValidators: true }
    );

    if (!donor) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Donor not found or inactive' });
    }

    const msgLang = language || donor.language || 'en';

    const log = await MessageLog.create(
      [{ donorId, amount, status: 'pending', language: msgLang }],
      { session }
    );

    await session.commitTransaction();

    // Fire-and-forget: send WhatsApp in background, don't block the response
    setImmediate(() =>
      sendWithRetry(
        { phone: donor.phone, donorName: donor.name, amount, language: msgLang },
        log[0]._id
      )
    );

    logger.info('Payment marked', { donorId, amount, logId: log[0]._id });

    res.json({
      success: true,
      message: 'Payment recorded. WhatsApp notification sending.',
      data: {
        donor: {
          id: donor._id,
          name: donor.name,
          totalAmount: donor.totalAmount,
          lastPayment: donor.lastPayment,
          lastPaidAt: donor.lastPaidAt,
        },
      },
    });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};

const bulkMarkPaid = async (req, res, next) => {
  try {
    const { payments } = req.body;

    const results = await Promise.allSettled(
      payments.map(({ donorId, amount, language }) =>
        _processSinglePayment(donorId, amount, language)
      )
    );

    const succeeded = [];
    const failed = [];

    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        succeeded.push({ donorId: payments[i].donorId, ...r.value });
      } else {
        failed.push({ donorId: payments[i].donorId, error: r.reason?.message });
      }
    });

    res.json({
      success: true,
      data: { succeeded, failed, total: payments.length },
    });
  } catch (err) {
    next(err);
  }
};

const getMessageLogs = async (req, res, next) => {
  try {
    const { donorId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (donorId) query.donorId = donorId;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      MessageLog.find(query)
        .populate('donorId', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      MessageLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    next(err);
  }
};

async function _processSinglePayment(donorId, amount, language) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const donor = await Donor.findOneAndUpdate(
      { _id: donorId, isActive: true },
      { $inc: { totalAmount: amount }, lastPayment: amount, lastPaidAt: new Date() },
      { new: true, session }
    );

    if (!donor) throw new Error('Donor not found');

    const msgLang = language || donor.language || 'en';
    const log = await MessageLog.create(
      [{ donorId, amount, status: 'pending', language: msgLang }],
      { session }
    );

    await session.commitTransaction();

    // Fire-and-forget per donor
    setImmediate(() =>
      sendWithRetry(
        { phone: donor.phone, donorName: donor.name, amount, language: msgLang },
        log[0]._id
      )
    );

    return { donorName: donor.name };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = { markPaid, bulkMarkPaid, getMessageLogs };
