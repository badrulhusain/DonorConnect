const Broadcast = require('../models/Broadcast');
const BroadcastLog = require('../models/BroadcastLog');
const Contact = require('../models/Contact');
const { sendWhatsAppBroadcastMessage } = require('../services/whatsappService');
const logger = require('../utils/logger');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createBroadcast = async (req, res) => {
  try {
    const { title, templateName, templateLanguage, parameters, recipientIds, tags } = req.body;

    let finalRecipientIds = recipientIds && recipientIds.length > 0 ? recipientIds : [];

    if ((!finalRecipientIds || finalRecipientIds.length === 0) && tags && tags.length > 0) {
      const contacts = await Contact.find({ tags: { $in: tags }, isActive: true }).select('_id');
      finalRecipientIds = contacts.map((c) => c._id);
    }

    if (finalRecipientIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipient is required' });
    }

    const broadcast = await Broadcast.create({
      title,
      templateName,
      templateLanguage: templateLanguage || 'en_US',
      parameters: parameters || [],
      recipientIds: finalRecipientIds,
      totalRecipients: finalRecipientIds.length,
      stats: { sent: 0, failed: 0, pending: finalRecipientIds.length },
      createdBy: req.admin._id,
    });

    res.status(201).json({ success: true, data: broadcast });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBroadcasts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const total = await Broadcast.countDocuments(filter);
    const broadcasts = await Broadcast.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: broadcasts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBroadcastById = async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, data: broadcast });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const sendBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    if (broadcast.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft broadcasts can be sent' });
    }

    broadcast.status = 'sending';
    broadcast.startedAt = new Date();
    await broadcast.save();

    const contacts = await Contact.find({ _id: { $in: broadcast.recipientIds } }).select('_id name phone');

    const logDocs = contacts.map((c) => ({
      broadcastId: broadcast._id,
      contactId: c._id,
      contactName: c.name,
      phone: c.phone,
      status: 'pending',
    }));

    const insertedLogs = await BroadcastLog.insertMany(logDocs);

    res.status(202).json({ success: true, message: 'Broadcast started' });

    setImmediate(async () => {
      try {
        const BATCH_SIZE = parseInt(process.env.WHATSAPP_BATCH_SIZE) || 10;
        const BATCH_DELAY = parseInt(process.env.WHATSAPP_BATCH_DELAY_MS) || 1000;

        const batches = [];
        for (let i = 0; i < insertedLogs.length; i += BATCH_SIZE) {
          batches.push(insertedLogs.slice(i, i + BATCH_SIZE));
        }

        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
          const batch = batches[batchIdx];

          const results = await Promise.allSettled(
            batch.map(async (log) => {
              await BroadcastLog.findByIdAndUpdate(log._id, { $inc: { attempts: 1 } });
              const result = await sendWhatsAppBroadcastMessage({
                phone: log.phone,
                templateName: broadcast.templateName,
                templateLanguage: broadcast.templateLanguage,
                parameters: broadcast.parameters,
              });
              await BroadcastLog.findByIdAndUpdate(log._id, {
                status: 'sent',
                whatsappMessageId: result.messageId,
                sentAt: new Date(),
              });
              return { success: true };
            })
          );

          let batchSent = 0;
          let batchFailed = 0;
          for (let i = 0; i < results.length; i++) {
            if (results[i].status === 'rejected') {
              batchFailed++;
              await BroadcastLog.findByIdAndUpdate(batch[i]._id, {
                status: 'failed',
                errorMessage: results[i].reason?.message || 'Unknown error',
              });
            } else {
              batchSent++;
            }
          }

          await Broadcast.findByIdAndUpdate(broadcast._id, {
            $inc: { 'stats.sent': batchSent, 'stats.failed': batchFailed },
          });

          if (batchIdx < batches.length - 1) {
            await sleep(BATCH_DELAY);
          }
        }

        const sentCount = await BroadcastLog.countDocuments({ broadcastId: broadcast._id, status: 'sent' });
        const failedCount = await BroadcastLog.countDocuments({ broadcastId: broadcast._id, status: 'failed' });
        const finalStatus = sentCount === 0 ? 'failed' : 'completed';

        await Broadcast.findByIdAndUpdate(broadcast._id, {
          status: finalStatus,
          completedAt: new Date(),
          'stats.sent': sentCount,
          'stats.failed': failedCount,
          'stats.pending': 0,
        });

        logger.info('Broadcast completed', { broadcastId: broadcast._id, sentCount, failedCount });
      } catch (err) {
        logger.error('Broadcast processing error', { broadcastId: broadcast._id, error: err.message });
        await Broadcast.findByIdAndUpdate(broadcast._id, { status: 'failed', completedAt: new Date() });
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBroadcastLogs = async (req, res) => {
  try {
    const { page = 1, limit = 25, status } = req.query;
    const filter = { broadcastId: req.params.id };
    if (status) filter.status = status;

    const total = await BroadcastLog.countDocuments(filter);
    const logs = await BroadcastLog.find(filter)
      .populate('contactId', 'name phone')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getBroadcastStats = async (req, res) => {
  try {
    const [totals] = await Broadcast.aggregate([
      {
        $group: {
          _id: null,
          totalBroadcasts: { $sum: 1 },
          totalMessagesSent: { $sum: '$stats.sent' },
          totalMessagesFailed: { $sum: '$stats.failed' },
        },
      },
    ]);

    const statusCounts = await Broadcast.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const broadcastsByStatus = { draft: 0, sending: 0, completed: 0, failed: 0 };
    for (const { _id, count } of statusCounts) {
      if (_id) broadcastsByStatus[_id] = count;
    }

    res.json({
      success: true,
      data: {
        totalBroadcasts: totals?.totalBroadcasts || 0,
        totalMessagesSent: totals?.totalMessagesSent || 0,
        totalMessagesFailed: totals?.totalMessagesFailed || 0,
        broadcastsByStatus,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const deleteBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    if (broadcast.status !== 'draft') {
      return res.status(400).json({ success: false, message: 'Only draft broadcasts can be deleted' });
    }

    await BroadcastLog.deleteMany({ broadcastId: broadcast._id });
    await broadcast.deleteOne();

    res.json({ success: true, message: 'Broadcast deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createBroadcast,
  getBroadcasts,
  getBroadcastById,
  sendBroadcast,
  getBroadcastLogs,
  getBroadcastStats,
  deleteBroadcast,
};
