/**
 * In-memory rate-limited message queue.
 *
 * Processes jobs one at a time with a 500 ms pause between each send —
 * well within Meta's per-second rate limit, no external dependencies required.
 *
 * Usage:
 *   const messageQueue = require('./messageQueue');
 *   messageQueue.add(() => sendWithRetry(...));
 */
class MessageQueue {
  constructor() {
    this.queue = [];
    this.running = false;
  }

  /** Enqueue an async job function and start processing if idle. */
  add(job) {
    this.queue.push(job);
    if (!this.running) this._process();
  }

  async _process() {
    this.running = true;
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      try {
        await job();
      } catch {
        // Errors are handled inside each job; don't let one failure stop the queue
      }
      if (this.queue.length > 0) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    this.running = false;
  }
}

// Singleton — shared across all requests in the same Node process
module.exports = new MessageQueue();
