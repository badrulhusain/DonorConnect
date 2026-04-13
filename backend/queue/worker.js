require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const { getRedisConnection } = require('./redisConnection');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const MessageLog = require('../models/MessageLog');
const logger = require('../utils/logger');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('Worker: MongoDB connected');
};

const processJob = async (job) => {
  const { donorId, donorName, phone, amount, logId, language } = job.data;

  logger.info('Processing WhatsApp job', {
    jobId: job.id,
    donorName,
    attempt: job.attemptsMade + 1,
  });

  await MessageLog.findByIdAndUpdate(logId, {
    $inc: { attempts: 1 },
    status: 'pending',
  });

  try {
    const result = await sendWhatsAppMessage({ phone, donorName, amount, language });

    await MessageLog.findByIdAndUpdate(logId, {
      status: 'sent',
      whatsappMessageId: result.messageId,
      sentAt: new Date(),
      errorMessage: null,
    });

    logger.info('WhatsApp job completed', { jobId: job.id, donorName, messageId: result.messageId });
    return result;
  } catch (err) {
    const isPermanent = err.permanent === true;
    const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 3) - 1;

    if (isPermanent || isLastAttempt) {
      await MessageLog.findByIdAndUpdate(logId, {
        status: 'failed',
        errorMessage: err.message,
      });
    }

    logger.error('WhatsApp job failed', {
      jobId: job.id,
      donorName,
      attempt: job.attemptsMade + 1,
      error: err.message,
      permanent: isPermanent,
    });

    throw err;
  }
};

const startWorker = async () => {
  await connectDB();

  const worker = new Worker('whatsappQueue', processJob, {
    connection: getRedisConnection(),
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed permanently', {
      jobId: job?.id,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { error: err.message });
  });

  logger.info('WhatsApp queue worker started');

  process.on('SIGTERM', async () => {
    logger.info('Worker shutting down...');
    await worker.close();
    await mongoose.disconnect();
    process.exit(0);
  });
};

startWorker().catch((err) => {
  logger.error('Worker startup failed', { error: err.message });
  process.exit(1);
});
