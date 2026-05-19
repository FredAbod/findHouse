const express = require('express');
const router = express.Router();
const {
  initializeProCheckout,
  getSubscriptionSummary
} = require('../controllers/billingController');
const { protect } = require('../middleware/authMiddleware');

router.post('/initialize-pro', protect, initializeProCheckout);
router.get('/subscription-status', protect, getSubscriptionSummary);

module.exports = router;
