const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const logger = require('../utils/logger');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Token missing.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Admin not found.' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    logger.warn('Invalid token attempt', { error: err.message });
    return res.status(401).json({ success: false, message: 'Unauthorized. Invalid or expired token.' });
  }
};

module.exports = { protect };
