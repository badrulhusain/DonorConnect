const { Redis } = require('ioredis');
const logger = require('../utils/logger');

let connection;

const getRedisConnection = () => {
  if (!connection) {
    connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
    });

    connection.on('connect', () => logger.info('Redis connected'));
    connection.on('error', (err) => logger.error('Redis error', { error: err.message }));
  }
  return connection;
};

module.exports = { getRedisConnection };
