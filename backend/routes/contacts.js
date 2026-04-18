const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getContacts,
  getTags,
  addContact,
  updateContact,
  deleteContact,
  importContacts,
} = require('../controllers/contactController');

router.use(protect);

router.get('/tags', getTags);
router.get('/', getContacts);
router.post('/import', importContacts);
router.post('/', addContact);
router.put('/:id', updateContact);
router.delete('/:id', deleteContact);

module.exports = router;
