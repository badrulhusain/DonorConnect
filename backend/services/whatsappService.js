const axios = require('axios');
const logger = require('../utils/logger');

const WA_API_URL = process.env.WHATSAPP_API_URL;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// Pre-approved template names per language
const TEMPLATES = {
  en: {
    name: process.env.WHATSAPP_TEMPLATE_NAME || 'donor_payment_confirmation',
    language: 'en_US',
  },
  ml: {
    name: process.env.WHATSAPP_TEMPLATE_NAME_ML || 'donor_payment_confirmation_ml',
    language: 'ml_IN',
  },
};

const buildTemplatePayload = (phone, donorName, amount, language = 'en') => {
  const template = TEMPLATES[language] || TEMPLATES.en;
  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name: template.name,
      language: { code: template.language },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: donorName },
            { type: 'text', text: formattedAmount },
          ],
        },
      ],
    },
  };
};

// general_announcement template — one body variable {{1}}
const buildAnnouncementPayload = (phone, templateParams = {}) => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: phone,
  type: 'template',
  template: {
    name: 'general_announcement',
    language: { code: 'en_US' },
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: String(templateParams['1'] || '') }],
      },
    ],
  },
});

const sendWhatsAppMessage = async ({ phone, donorName, amount, language = 'en', templateName, templateParams }) => {
  if (!WA_API_URL || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error('WhatsApp API credentials not configured');
  }

  const url = `${WA_API_URL}/${PHONE_NUMBER_ID}/messages`;
  const payload =
    templateName === 'general_announcement'
      ? buildAnnouncementPayload(phone, templateParams)
      : buildTemplatePayload(phone, donorName, amount, language);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const messageId = response.data?.messages?.[0]?.id;
    logger.info('WhatsApp message sent', { phone, messageId, donorName });

    return { success: true, messageId };
  } catch (err) {
    const errData = err.response?.data?.error;
    const errMsg = errData
      ? `[${errData.code}] ${errData.message}`
      : err.message;

    logger.error('WhatsApp API error', {
      phone,
      donorName,
      status: err.response?.status,
      error: errMsg,
    });

    const isRateLimit = err.response?.status === 429;
    const isAuthError = err.response?.status === 401;

    if (isAuthError) {
      throw Object.assign(new Error(`Auth failed: ${errMsg}`), { permanent: true });
    }

    throw new Error(errMsg);
  }
};

module.exports = { sendWhatsAppMessage };
