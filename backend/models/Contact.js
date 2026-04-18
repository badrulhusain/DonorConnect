const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/^\+[1-9]\d{6,14}$/, 'Phone must be E.164 format e.g. +60123456789'],
    },
    tags: { type: [String], default: [] },
    language: { type: String, enum: ['en', 'ml'], default: 'en' },
    notes: { type: String, maxlength: 500 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

contactSchema.index({ name: 'text', phone: 'text' });
contactSchema.index({ tags: 1 });

module.exports = mongoose.model('Contact', contactSchema);
