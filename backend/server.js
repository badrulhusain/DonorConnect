require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const logger = require('./utils/logger');
const seedAdmin = require('./utils/seedAdmin');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const broadcastRoutes = require('./routes/broadcasts');
const notificationRoutes = require('./routes/notifications');
const { notFound, globalErrorHandler } = require('./middleware/errorHandler');

const logsDir = path.join(__dirname, 'logs');
try { if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir); } catch (_) { /* read-only fs in serverless */ }

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Try again in 15 minutes.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts.' },
});

app.use('/api', limiter);
app.use('/api/auth/login', authLimiter);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

const isDev = process.env.NODE_ENV !== 'production';

// In dev: colorized one-liner per request printed to console.
// In prod: structured JSON written to log file.
if (isDev) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// Dev-only: log request body so you can see exactly what arrived.
if (isDev) {
  app.use((req, _res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length) {
      logger.debug(`[BODY] ${req.method} ${req.originalUrl}`, { body: req.body });
    }
    next();
  });
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    routes: ['/api/auth', '/api/contacts', '/api/broadcasts'],
  });
});

app.use(async (_req, _res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB connected (serverless cold start)');
    await seedAdmin();
  } catch (err) {
    return next(err);
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/notify', notificationRoutes);

if (isDev) {
  const debugRoutes = require('./routes/debug');
  app.use('/api/debug', debugRoutes);
  logger.info('Debug routes enabled: GET /api/debug/whatsapp, POST /api/debug/send-test');
}

app.use(notFound);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

module.exports = app;

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
      logger.info('MongoDB connected');
      await seedAdmin();
      app.listen(PORT, () => logger.info(`WhatsApp Broadcast server running on port ${PORT}`));
    })
    .catch((err) => {
      logger.error('Startup failed', { error: err.message });
      process.exit(1);
    });
}

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { error: err.message });
  process.exit(1);
});
