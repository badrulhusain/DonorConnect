const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const logger = require('./logger');

const seedAdmin = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;

  const exists = await Admin.findOne({ email: ADMIN_EMAIL });
  if (exists) return;

  await Admin.create({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Super Admin' });
  logger.info('Admin seeded', { email: ADMIN_EMAIL });
};

module.exports = seedAdmin;
