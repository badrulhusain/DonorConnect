const express = require('express');
const router = express.Router();
const {
  getDonors,
  addDonor,
  updateDonor,
  deleteDonor,
  getAnalytics,
  exportCSV,
} = require('../controllers/donorController');
const { protect } = require('../middleware/auth');
const { donorValidation } = require('../utils/validators');
const { validate } = require('../middleware/errorHandler');

router.use(protect);

router.get('/', getDonors);
router.get('/analytics', getAnalytics);
router.get('/export/csv', exportCSV);
router.post('/', donorValidation, validate, addDonor);
router.put('/:id', updateDonor);
router.delete('/:id', deleteDonor);

module.exports = router;
