const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const isDev = process.env.NODE_ENV !== 'production';

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({ field: e.path, message: e.msg }));
    logger.warn('Validation failed', { url: req.originalUrl, errors: formatted });
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formatted,
    });
  }
  next();
};

const notFound = (req, res) => {
  const msg = `[404] ${req.method} ${req.originalUrl} — no route matched`;
  logger.warn(msg, {
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    query: req.query,
  });

  const payload = {
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  };

  if (isDev) {
    payload.hint = 'Check that the backend route is registered in server.js and the URL prefix is correct.';
    payload.registeredPrefixes = ['/api/auth', '/api/contacts', '/api/broadcasts', '/api/notify', '/health'];
  }

  res.status(404).json(payload);
};

const globalErrorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;

  logger.error('Unhandled error', {
    status,
    error: err.message,
    stack: isDev ? err.stack : undefined,
    method: req.method,
    url: req.originalUrl,
    body: req.body,
    query: req.query,
  });

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ID format: ${err.value}` });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `Duplicate value: ${field} already exists` });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  const payload = {
    success: false,
    message: isDev ? err.message : 'Internal server error',
  };

  if (isDev) {
    payload.stack = err.stack?.split('\n').slice(0, 6);
    payload.errorType = err.name;
  }

  res.status(status).json(payload);
};

module.exports = { validate, notFound, globalErrorHandler };
