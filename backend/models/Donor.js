const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format'],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPayment: {
      type: Number,
      default: null,
    },
    lastPaidAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    language: {
      type: String,
      enum: ['en', 'ml'],
      default: 'en',
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

donorSchema.index({ name: 'text', phone: 'text' });
donorSchema.index({ lastPaidAt: -1 });

module.exports = mongoose.model('Donor', donorSchema);
