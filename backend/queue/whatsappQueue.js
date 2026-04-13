const { Queue } = require('bullmq');
const { getRedisConnection } = require('./redisConnection');

let whatsappQueue;

const getWhatsappQueue = () => {
  if (!whatsappQueue) {
    whatsappQueue = new Queue('whatsappQueue', {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return whatsappQueue;
};

module.exports = { get whatsappQueue() { return getWhatsappQueue(); } };
