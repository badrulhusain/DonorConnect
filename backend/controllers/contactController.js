const Contact = require('../models/Contact');
const logger = require('../utils/logger');

const phoneRegex = /^\+[1-9]\d{6,14}$/;

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tags === 'string') return tags.split(',').map((t) => t.trim()).filter(Boolean);
  return [];
};

const getContacts = async (req, res) => {
  try {
    const { search, page = 1, limit = 20, tag, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (tag) filter.tags = tag;

    const total = await Contact.countDocuments(filter);
    const contacts = await Contact.find(filter)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: contacts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getTags = async (req, res) => {
  try {
    const tags = await Contact.distinct('tags', { isActive: true });
    res.json({ success: true, data: tags.filter(Boolean).sort() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const addContact = async (req, res) => {
  try {
    const { name, phone, language, tags, notes } = req.body;
    const contact = await Contact.create({
      name,
      phone,
      language,
      tags: normalizeTags(tags),
      notes,
    });
    logger.info('Contact added', { name, phone });
    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Phone number already exists' });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

const updateContact = async (req, res) => {
  try {
    const { name, phone, language, tags, notes } = req.body;
    const update = { name, phone, language, notes };
    if (tags !== undefined) update.tags = normalizeTags(tags);

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Phone number already exists' });
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

const deleteContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const importContacts = async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'contacts array is required' });
    }

    const ops = [];
    const errors = [];

    for (const c of contacts) {
      if (!c.phone || !phoneRegex.test(c.phone)) {
        errors.push({ phone: c.phone, reason: 'Invalid E.164 phone format' });
        continue;
      }
      if (!c.name) {
        errors.push({ phone: c.phone, reason: 'Name is required' });
        continue;
      }
      ops.push({
        updateOne: {
          filter: { phone: c.phone },
          update: {
            $set: {
              name: c.name,
              language: ['en', 'ml'].includes(c.language) ? c.language : 'en',
              tags: normalizeTags(c.tags),
              notes: c.notes || '',
              isActive: true,
            },
          },
          upsert: true,
        },
      });
    }

    let imported = 0;
    if (ops.length > 0) {
      const result = await Contact.bulkWrite(ops);
      imported = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    }

    res.json({
      success: true,
      imported,
      skipped: contacts.length - ops.length - errors.length,
      errors,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getContacts, getTags, addContact, updateContact, deleteContact, importContacts };
