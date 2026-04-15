const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { protect } = require('../middleware/auth');
const { sendBulk, getProgress } = require('../controllers/messageController');

// Middleware that accepts Bearer token in the Authorization header OR ?token= query param.
// EventSource cannot send custom headers, so the frontend passes the JWT as a query
// parameter for the SSE progress route.
const protectSSE = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const raw = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.query.token;

  if (!raw) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Token missing.' });
  }

  try {
    const decoded = jwt.verify(raw, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Admin not found.' });
    }
    req.admin = admin;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorized. Invalid or expired token.' });
  }
};

router.post('/send-bulk', protect, sendBulk);
router.get('/progress/:jobId', protectSSE, getProgress);

module.exports = router;
