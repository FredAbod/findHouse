const express = require('express');
const router = express.Router();
const {
  listConversations,
  getConversation,
  startConversation,
  sendMessage,
  respondToViewing
} = require('../controllers/messagingController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(listConversations).post(startConversation);
router.get('/:id', getConversation);
router.post('/:id/messages', sendMessage);
router.patch('/:id/messages/:messageId/viewing', respondToViewing);

module.exports = router;
