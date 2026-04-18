const mongoose = require('mongoose');

const broadcastLogSchema = new mongoose.Schema(
  {
    broadcastId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Broadcast',
      required: true,
      index: true,
    },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
    contactName: { type: String },
    phone: { type: String, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    whatsappMessageId: { type: String, default: null },
    errorMessage: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

broadcastLogSchema.index({ status: 1, broadcastId: 1 });

module.exports = mongoose.model('BroadcastLog', broadcastLogSchema);
