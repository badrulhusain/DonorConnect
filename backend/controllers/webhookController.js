const logger = require('../utils/logger');

// GET /webhook — Meta calls this once to verify the endpoint
const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }

  logger.warn('WhatsApp webhook verification failed', { mode, token });
  return res.status(403).send('Forbidden');
};

// POST /webhook — Meta sends incoming messages here
const receiveMessage = (req, res) => {
  const entry = req.body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;
  const message = value?.messages?.[0];

  if (message) {
    const from = message.from;
    const text = message.text?.body;
    const type = message.type;

    logger.info('WhatsApp message received', { from, type, text });
    // TODO: handle replies, status updates, etc.
  }

  // Always respond 200 quickly so Meta doesn't retry
  return res.status(200).json({ status: 'ok' });
};

module.exports = { verifyWebhook, receiveMessage };
