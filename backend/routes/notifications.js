const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  sendEventNotification,
  sendProgrammeNotification,
  sendBulkPaymentNotification,
  getNotificationLogs,
  resendNotification,
} = require('../controllers/notificationController');

router.use(protect);

router.post('/event', sendEventNotification);
router.post('/programme', sendProgrammeNotification);
router.post('/bulk-payment', sendBulkPaymentNotification);
router.get('/logs', getNotificationLogs);
router.post('/resend/:id', resendNotification);

module.exports = router;
