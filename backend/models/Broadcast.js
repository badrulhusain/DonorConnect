const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    templateName: { type: String, required: true, trim: true },
    templateLanguage: { type: String, default: 'en_US' },
    parameters: { type: [String], default: [] },
    recipientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
    totalRecipients: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'sending', 'completed', 'failed'],
      default: 'draft',
    },
    stats: {
      sent: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
    },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Broadcast', broadcastSchema);
