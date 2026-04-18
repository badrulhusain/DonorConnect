const axios = require('axios');
const logger = require('../utils/logger');

const WA_API_URL = process.env.WHATSAPP_API_URL;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

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

const sendWhatsAppMessage = async ({ phone, donorName, amount, language = 'en' }) => {
  if (!WA_API_URL || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error('WhatsApp API credentials not configured');
  }

  const url = `${WA_API_URL}/${PHONE_NUMBER_ID}/messages`;
  const payload = buildTemplatePayload(phone, donorName, amount, language);

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const messageId = response.data?.messages?.[0]?.id;
    logger.info('WhatsApp message sent', { phone, messageId });
    return { success: true, messageId };
  } catch (err) {
    const errData = err.response?.data?.error;
    const errMsg = errData ? `[${errData.code}] ${errData.message}` : err.message;
    logger.error('WhatsApp API error', { phone, status: err.response?.status, error: errMsg });

    if (err.response?.status === 401) {
      throw Object.assign(new Error(`Auth failed: ${errMsg}`), { permanent: true });
    }
    throw new Error(errMsg);
  }
};

const sendWhatsAppBroadcastMessage = async ({ phone, templateName, templateLanguage, parameters }) => {
  if (!WA_API_URL || !PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    throw new Error('WhatsApp API credentials not configured');
  }

  const url = `${WA_API_URL}/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components:
        parameters && parameters.length > 0
          ? [
              {
                type: 'body',
                parameters: parameters.map((p) => ({ type: 'text', text: String(p) })),
              },
            ]
          : [],
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const messageId = response.data?.messages?.[0]?.id;
    logger.info('WhatsApp broadcast message sent', { phone, messageId, templateName });
    return { success: true, messageId };
  } catch (err) {
    const errData = err.response?.data?.error;
    const errMsg = errData ? `[${errData.code}] ${errData.message}` : err.message;
    logger.error('WhatsApp broadcast API error', {
      phone,
      templateName,
      status: err.response?.status,
      error: errMsg,
    });

    if (err.response?.status === 401) {
      throw Object.assign(new Error(`Auth failed: ${errMsg}`), { permanent: true });
    }
    throw new Error(errMsg);
  }
};

module.exports = { sendWhatsAppMessage, sendWhatsAppBroadcastMessage };
