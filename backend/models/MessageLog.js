const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema(
  {
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      default: 0,
    },
    templateName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending',
    },
    whatsappMessageId: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    jobId: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      enum: ['en', 'ml'],
      default: 'en',
    },
  },
  { timestamps: true }
);

messageLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('MessageLog', messageLogSchema);
