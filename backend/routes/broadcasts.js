const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createBroadcast,
  getBroadcasts,
  getBroadcastById,
  sendBroadcast,
  getBroadcastLogs,
  getBroadcastStats,
  deleteBroadcast,
} = require('../controllers/broadcastController');

router.use(protect);

router.get('/stats', getBroadcastStats);
router.get('/', getBroadcasts);
router.post('/', createBroadcast);
router.get('/:id', getBroadcastById);
router.post('/:id/send', sendBroadcast);
router.get('/:id/logs', getBroadcastLogs);
router.delete('/:id', deleteBroadcast);

module.exports = router;
