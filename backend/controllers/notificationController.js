const { sendWhatsAppMessage } = require('../services/whatsappService');
const NotificationLog = require('../models/NotificationLog');
const logger = require('../utils/logger');

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

const validateRecipient = (r) => E164_REGEX.test(r.phone);

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sendBatch = async (batch, messageBuilder, type, metadata) => {
  const results = await Promise.allSettled(
    batch.map(async (recipient) => {
      const lang = ['en', 'ml'].includes(recipient.language) ? recipient.language : 'en';
      const templates = {
        payment: { en: 'payment_confirmation_en', ml: 'payment_confirmation_ml' },
        event: { en: 'event_invitation_en', ml: 'event_invitation_ml' },
        programme: { en: 'programme_invitation_en', ml: 'programme_invitation_ml' },
      };
      const templateName = (templates[type] || templates.payment)[lang];

      const log = await NotificationLog.create({
        recipient: recipient.phone,
        recipientName: recipient.name,
        type,
        templateName,
        language: lang,
        metadata,
        attempts: 1,
      });

      try {
        const params = messageBuilder(recipient, lang);
        const result = await sendWhatsAppMessage({ phone: recipient.phone, ...params });
        await NotificationLog.findByIdAndUpdate(log._id, {
          status: 'sent',
          gupshupMessageId: result.messageId,
          sentAt: new Date(),
        });
        return { phone: recipient.phone, success: true, messageId: result.messageId };
      } catch (err) {
        await NotificationLog.findByIdAndUpdate(log._id, {
          status: 'failed',
          errorMessage: err.message,
        });
        return { phone: recipient.phone, success: false, error: err.message };
      }
    })
  );

  return results.map((r) => (r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }));
};

const runBatched = async (recipients, messageBuilder, type, metadata) => {
  const allResults = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const batchResults = await sendBatch(batch, messageBuilder, type, metadata);
    allResults.push(...batchResults);
    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  return allResults;
};

const summarize = (results) => ({
  total: results.length,
  sent: results.filter((r) => r.success).length,
  failed: results.filter((r) => !r.success).length,
  results,
});

exports.sendEventNotification = async (req, res, next) => {
  try {
    const { recipients, eventName, date, time, venue } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'recipients array is required' });
    }
    if (!eventName || !date || !time || !venue) {
      return res.status(400).json({ success: false, message: 'eventName, date, time, venue are required' });
    }

    const valid = recipients.filter(validateRecipient);
    const invalid = recipients.filter((r) => !validateRecipient(r));

    const metadata = { eventName, date, time, venue };

    const results = await runBatched(
      valid,
      (recipient, lang) => ({ recipientName: recipient.name, language: lang, type: 'event', eventName, date, time, venue }),
      'event',
      metadata
    );

    logger.info('[WHATSAPP] event batch complete', summarize(results));

    res.json({
      success: true,
      summary: summarize(results),
      skipped: invalid.map((r) => ({ phone: r.phone, reason: 'Invalid E.164 phone number' })),
    });
  } catch (err) {
    next(err);
  }
};

exports.sendProgrammeNotification = async (req, res, next) => {
  try {
    const { recipients, programmeName, date, time, venue } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'recipients array is required' });
    }
    if (!programmeName || !date || !time || !venue) {
      return res.status(400).json({ success: false, message: 'programmeName, date, time, venue are required' });
    }

    const valid = recipients.filter(validateRecipient);
    const invalid = recipients.filter((r) => !validateRecipient(r));

    const metadata = { programmeName, date, time, venue };

    const results = await runBatched(
      valid,
      (recipient, lang) => ({ recipientName: recipient.name, language: lang, type: 'programme', programmeName, date, time, venue }),
      'programme',
      metadata
    );

    logger.info('[WHATSAPP] programme batch complete', summarize(results));

    res.json({
      success: true,
      summary: summarize(results),
      skipped: invalid.map((r) => ({ phone: r.phone, reason: 'Invalid E.164 phone number' })),
    });
  } catch (err) {
    next(err);
  }
};

exports.sendBulkPaymentNotification = async (req, res, next) => {
  try {
    const { payments } = req.body;

    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ success: false, message: 'payments array is required' });
    }

    const valid = payments.filter((p) => validateRecipient(p) && p.amount != null);
    const invalid = payments.filter((p) => !validateRecipient(p) || p.amount == null);

    const results = await runBatched(
      valid,
      (recipient, lang) => ({
        recipientName: recipient.name,
        language: lang,
        type: 'payment',
        amount: recipient.amount,
      }),
      'payment',
      {}
    );

    logger.info('[WHATSAPP] bulk-payment batch complete', summarize(results));

    res.json({
      success: true,
      summary: summarize(results),
      skipped: invalid.map((r) => ({ phone: r.phone, reason: 'Invalid phone or missing amount' })),
    });
  } catch (err) {
    next(err);
  }
};

exports.getNotificationLogs = async (req, res, next) => {
  try {
    const { type, status, page = 1, limit = 20, from, to } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      NotificationLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      NotificationLog.countDocuments(filter),
    ]);

    res.json({ success: true, logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    next(err);
  }
};

exports.resendNotification = async (req, res, next) => {
  try {
    const log = await NotificationLog.findById(req.params.id);
    if (!log) return res.status(404).json({ success: false, message: 'Notification log not found' });
    if (log.status !== 'failed') {
      return res.status(400).json({ success: false, message: 'Only failed notifications can be resent' });
    }

    await NotificationLog.findByIdAndUpdate(log._id, { status: 'pending', attempts: log.attempts + 1, errorMessage: null });

    try {
      const params = {
        phone: log.recipient,
        recipientName: log.recipientName,
        language: log.language,
        type: log.type,
        ...log.metadata,
      };
      const result = await sendWhatsAppMessage(params);
      await NotificationLog.findByIdAndUpdate(log._id, {
        status: 'sent',
        gupshupMessageId: result.messageId,
        sentAt: new Date(),
      });
      res.json({ success: true, messageId: result.messageId });
    } catch (err) {
      await NotificationLog.findByIdAndUpdate(log._id, { status: 'failed', errorMessage: err.message });
      throw err;
    }
  } catch (err) {
    next(err);
  }
};
