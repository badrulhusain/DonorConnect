const { body, param, query } = require('express-validator');

const phoneRegex = /^\+[1-9]\d{6,14}$/;

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const donorValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(phoneRegex)
    .withMessage('Phone must be in E.164 format e.g. +60123456789'),
];

const markPaidValidation = [
  body('donorId').isMongoId().withMessage('Valid donor ID required'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number'),
  body('language')
    .optional()
    .isIn(['en', 'ml'])
    .withMessage('Language must be en or ml'),
];

const bulkMarkPaidValidation = [
  body('payments').isArray({ min: 1 }).withMessage('Payments array required'),
  body('payments.*.donorId').isMongoId().withMessage('Valid donor ID required'),
  body('payments.*.amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
];

module.exports = {
  loginValidation,
  donorValidation,
  markPaidValidation,
  bulkMarkPaidValidation,
};
