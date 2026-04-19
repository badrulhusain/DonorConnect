const axios = require('axios');
const logger = require('../utils/logger');

const GUPSHUP_API_URL = 'https://api.gupshup.io/wa/api/v1/template/msg';
const API_KEY = process.env.GUPSHUP_API_KEY;
const SOURCE_MOBILE = process.env.GUPSHUP_SOURCE_MOBILE;
const APP_NAME = process.env.GUPSHUP_APP_NAME;

const TEMPLATES = {
  payment: { en: 'payment_confirmation_en', ml: 'payment_confirmation_ml' },
  event: { en: 'event_invitation_en', ml: 'event_invitation_ml' },
  programme: { en: 'programme_invitation_en', ml: 'programme_invitation_ml' },
};

const cleanPhone = (phone) => String(phone).replace(/^\+/, '');

const formatAmount = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

const buildTemplateParams = ({ type = 'payment', recipientName, amount, eventName, programmeName, date, time, venue }) => {
  switch (type) {
    case 'event':
      return [recipientName, eventName, date, time, venue];
    case 'programme':
      return [recipientName, programmeName, date, time, venue];
    default:
      return [recipientName, formatAmount(amount)];
  }
};

const callGupshup = async (phone, templateName, templateParams) => {
  if (!API_KEY || !SOURCE_MOBILE || !APP_NAME) {
    throw Object.assign(new Error('Gupshup credentials not configured'), { permanent: true });
  }

  const body = new URLSearchParams();
  body.append('channel', 'whatsapp');
  body.append('source', cleanPhone(SOURCE_MOBILE));
  body.append('destination', cleanPhone(phone));
  body.append('src.name', APP_NAME);
  body.append('template', JSON.stringify({ id: templateName, params: templateParams }));

  const response = await axios.post(GUPSHUP_API_URL, body.toString(), {
    headers: {
      apikey: API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeout: 15000,
  });

  const msgId = response.data?.messageId || response.data?.response?.messageId;
  return { success: true, messageId: msgId };
};

const withRetry = async (fn, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.permanent || attempt === retries) throw err;
      const delay = err.retryAfter || 2000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};

const mapGupshupError = (err, phone, templateName) => {
  const status = err.response?.status;
  const body = err.response?.data;
  const rawMsg = body?.message || body?.error?.message || err.message;

  logger.error('[WHATSAPP] API error', { phone, templateName, status, error: rawMsg });

  if (status === 401) {
    throw Object.assign(new Error(`Invalid Gupshup API key: ${rawMsg}`), { permanent: true });
  }
  if (status === 429) {
    throw Object.assign(new Error(`Rate limit exceeded: ${rawMsg}`), { retryAfter: 2000 });
  }
  if (status === 400) {
    throw Object.assign(new Error(`Invalid template or phone number: ${rawMsg}`), { permanent: true });
  }
  if (status === 503) {
    throw new Error(`Gupshup server unavailable: ${rawMsg}`);
  }
  throw new Error(rawMsg || 'Gupshup API error');
};

const sendWhatsAppMessage = async ({
  phone,
  recipientName,
  donorName,
  amount,
  language = 'en',
  type = 'payment',
  eventName,
  programmeName,
  date,
  time,
  venue,
}) => {
  const name = recipientName || donorName;
  const lang = ['en', 'ml'].includes(language) ? language : 'en';
  const templateGroup = TEMPLATES[type] || TEMPLATES.payment;
  const templateName = templateGroup[lang];
  const templateParams = buildTemplateParams({ type, recipientName: name, amount, eventName, programmeName, date, time, venue });

  try {
    const result = await withRetry(() => callGupshup(phone, templateName, templateParams));
    logger.info(`[WHATSAPP] type=${type} recipient=${phone} status=sent`, { messageId: result.messageId });
    return result;
  } catch (err) {
    mapGupshupError(err, phone, templateName);
  }
};

const sendWhatsAppBroadcastMessage = async ({ phone, templateName, templateLanguage, parameters }) => {
  const templateParams = (parameters || []).map(String);

  try {
    const result = await withRetry(() => callGupshup(phone, templateName, templateParams));
    logger.info(`[WHATSAPP] type=broadcast recipient=${phone} status=sent`, { templateName, messageId: result.messageId });
    return result;
  } catch (err) {
    mapGupshupError(err, phone, templateName);
  }
};

module.exports = { sendWhatsAppMessage, sendWhatsAppBroadcastMessage };
