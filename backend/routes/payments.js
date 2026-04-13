const express = require('express');
const router = express.Router();
const { markPaid, bulkMarkPaid, getMessageLogs } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { markPaidValidation, bulkMarkPaidValidation } = require('../utils/validators');
const { validate } = require('../middleware/errorHandler');

router.use(protect);

router.post('/mark-paid', markPaidValidation, validate, markPaid);
router.post('/mark-paid/bulk', bulkMarkPaidValidation, validate, bulkMarkPaid);
router.get('/logs', getMessageLogs);

module.exports = router;
