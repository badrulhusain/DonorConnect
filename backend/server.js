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
const donorRoutes = require('./routes/donors');
const paymentRoutes = require('./routes/payments');
const messageRoutes = require('./routes/messages');
const { notFound, globalErrorHandler } = require('./middleware/errorHandler');

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
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

// Parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP logging
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api', paymentRoutes);
app.use('/api/messages', messageRoutes);

// Error handlers
app.use(notFound);
app.use(globalErrorHandler);

// DB + Server startup
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB connected');

    await seedAdmin();

    app.listen(PORT, () => {
      logger.info(`AmanahTrack server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
};

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { error: err.message });
  process.exit(1);
});

start();

module.exports = app;
