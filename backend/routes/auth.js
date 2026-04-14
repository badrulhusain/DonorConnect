const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { loginValidation } = require('../utils/validators');
const { validate } = require('../middleware/errorHandler');

router.post('/login', loginValidation, validate, login);
router.get('/me', protect, getMe);

module.exports = router;
