const mongoose = require('mongoose');
const Donor = require('../models/Donor');
const MessageLog = require('../models/MessageLog');
const { whatsappQueue } = require('../queue/whatsappQueue');
const logger = require('../utils/logger');

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

    const job = await whatsappQueue.add(
      'send-message',
      {
        donorId: donor._id.toString(),
        donorName: donor.name,
        phone: donor.phone,
        amount,
        logId: log[0]._id.toString(),
        language: msgLang,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      }
    );

    await MessageLog.findByIdAndUpdate(log[0]._id, { jobId: job.id });

    logger.info('Payment marked and job queued', {
      donorId,
      amount,
      jobId: job.id,
      logId: log[0]._id,
    });

    res.json({
      success: true,
      message: 'Payment recorded. WhatsApp notification queued.',
      data: {
        donor: {
          id: donor._id,
          name: donor.name,
          totalAmount: donor.totalAmount,
          lastPayment: donor.lastPayment,
          lastPaidAt: donor.lastPaidAt,
        },
        jobId: job.id,
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

    const job = await whatsappQueue.add(
      'send-message',
      { donorId: donor._id.toString(), donorName: donor.name, phone: donor.phone, amount, logId: log[0]._id.toString(), language: msgLang },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
    );

    await MessageLog.findByIdAndUpdate(log[0]._id, { jobId: job.id });
    return { jobId: job.id, donorName: donor.name };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}

module.exports = { markPaid, bulkMarkPaid, getMessageLogs };
