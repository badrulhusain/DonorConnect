const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true },
    recipientName: { type: String, required: true },
    type: { type: String, enum: ['payment', 'event', 'programme'], required: true },
    templateName: { type: String, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    gupshupMessageId: { type: String },
    errorMessage: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    language: { type: String, enum: ['en', 'ml'], default: 'en' },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

notificationLogSchema.index({ type: 1, status: 1, createdAt: -1 });
notificationLogSchema.index({ recipient: 1 });

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
