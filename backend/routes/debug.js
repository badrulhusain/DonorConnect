const express = require('express');
const axios = require('axios');
const router = express.Router();
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

// Only mount this router in development — server.js guards it
router.use(protect);

// GET /api/debug/whatsapp
// Checks every env var, calls the WA API to verify the phone number ID is real,
// and returns a structured status report.
router.get('/whatsapp', async (req, res) => {
  const WA_URL   = process.env.WHATSAPP_API_URL;
  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN;

  const config = {
    WHATSAPP_API_URL:         WA_URL   ? '✓ set' : '✗ MISSING',
    WHATSAPP_PHONE_NUMBER_ID: PHONE_ID ? `✓ ${PHONE_ID}` : '✗ MISSING',
    WHATSAPP_ACCESS_TOKEN:    TOKEN    ? `✓ ...${TOKEN.slice(-8)}` : '✗ MISSING',
    WHATSAPP_BATCH_SIZE:      process.env.WHATSAPP_BATCH_SIZE || '10 (default)',
    WHATSAPP_BATCH_DELAY_MS:  process.env.WHATSAPP_BATCH_DELAY_MS || '1000 (default)',
  };

  if (!WA_URL || !PHONE_ID || !TOKEN) {
    return res.status(200).json({
      success: false,
      message: 'One or more WhatsApp credentials are missing from .env',
      config,
    });
  }

  // Ping the phone number endpoint to validate credentials
  const url = `${WA_URL}/${PHONE_ID}?fields=display_phone_number,verified_name,quality_rating`;
  try {
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      timeout: 8000,
    });

    logger.info('[debug] WhatsApp credential check passed', data);

    return res.json({
      success: true,
      message: 'Credentials are valid. WhatsApp API is reachable.',
      phoneNumber: {
        display: data.display_phone_number,
        verifiedName: data.verified_name,
        qualityRating: data.quality_rating,
        id: PHONE_ID,
      },
      config,
    });
  } catch (err) {
    const status  = err.response?.status;
    const fbError = err.response?.data?.error;
    const axiosCode = err.code; // e.g. ECONNREFUSED, ETIMEDOUT, ENOTFOUND

    logger.error('[debug] WhatsApp credential check failed', {
      status,
      axiosCode,
      errMessage: err.message,
      fbError,
    });

    let message, hint;

    if (fbError) {
      message = `Meta API error ${status}: [${fbError.code}] ${fbError.message}`;
      hint = fbError.code === 190
        ? 'Access token is expired or invalid. Go to Meta Business Manager → System Users → Generate new token with whatsapp_business_messaging permission.'
        : status === 400
        ? 'Phone number ID is wrong. Open Meta Business Manager → WhatsApp → API Setup, copy the Phone number ID.'
        : `Meta error code ${fbError.code} — check developers.facebook.com/docs/whatsapp/error-codes`;
    } else {
      message = `Network/SSL error — backend could not reach graph.facebook.com`;
      hint = axiosCode === 'ENOTFOUND'
        ? 'DNS failed: the server cannot resolve graph.facebook.com. Check internet connectivity.'
        : axiosCode === 'ETIMEDOUT' || axiosCode === 'ECONNABORTED'
        ? 'Request timed out. graph.facebook.com is not reachable from this machine.'
        : axiosCode === 'CERT_HAS_EXPIRED' || axiosCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
        ? 'SSL certificate error. Try setting NODE_TLS_REJECT_UNAUTHORIZED=0 temporarily to confirm.'
        : `Axios error code: ${axiosCode || 'unknown'} — raw message: ${err.message}`;
    }

    return res.status(200).json({
      success: false,
      message,
      hint,
      axiosCode: axiosCode || null,
      rawErrMessage: err.message || null,
      config,
      raw: fbError || null,
    });
  }
});

// POST /api/debug/send-test
// Body: { phone: "+60123456789", templateName: "hello_world", templateLanguage: "en_US", parameters: [] }
// Sends a real message so you can confirm end-to-end delivery.
router.post('/send-test', async (req, res) => {
  const { phone, templateName = 'hello_world', templateLanguage = 'en_US', parameters = [] } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'phone is required (E.164 format, e.g. +60123456789)' });
  }

  const WA_URL   = process.env.WHATSAPP_API_URL;
  const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!WA_URL || !PHONE_ID || !TOKEN) {
    return res.status(400).json({ success: false, message: 'WhatsApp credentials not configured in .env' });
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: templateLanguage },
      components: parameters.length > 0
        ? [{ type: 'body', parameters: parameters.map((p) => ({ type: 'text', text: String(p) })) }]
        : [],
    },
  };

  logger.info('[debug] Sending test message', { phone, templateName, templateLanguage, parameters });

  try {
    const url = `${WA_URL}/${PHONE_ID}/messages`;
    const { data } = await axios.post(url, payload, {
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      timeout: 10000,
    });

    const messageId = data?.messages?.[0]?.id;
    logger.info('[debug] Test message sent', { phone, messageId });

    return res.json({
      success: true,
      message: `Message sent to ${phone}`,
      messageId,
      sentPayload: payload,
    });
  } catch (err) {
    const status  = err.response?.status;
    const fbError = err.response?.data?.error;

    logger.error('[debug] Test message failed', { status, fbError });

    const hint = fbError?.code === 132000
      ? 'Template not found or not approved. Check the template name exactly as it appears in Meta Business Manager.'
      : fbError?.code === 131030
      ? 'Recipient phone not in the test whitelist. Add it in Meta Business Manager > WhatsApp > API Setup > Test numbers.'
      : fbError?.code === 100
      ? 'Invalid parameter — likely wrong templateName, templateLanguage, or parameter count.'
      : status === 401
      ? 'Access token is invalid or expired.'
      : null;

    return res.status(200).json({
      success: false,
      message: fbError
        ? `Meta API error ${status}: [${fbError.code}] ${fbError.message}`
        : err.message,
      hint,
      sentPayload: payload,
      raw: err.response?.data || null,
    });
  }
});

module.exports = router;
