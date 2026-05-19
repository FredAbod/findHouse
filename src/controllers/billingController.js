const asyncHandler = require('express-async-handler');
const billingService = require('../services/billingService');

const initializeProCheckout = asyncHandler(async (req, res) => {
  const checkout = await billingService.initializeProCheckout(req.user);
  res.json(checkout);
});

const getSubscriptionSummary = asyncHandler(async (req, res) => {
  const User = require('../models/userModel');
  const fresh = await User.findById(req.user._id).select('billing role').lean();
  if (!fresh) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json(billingService.sanitizeBillingPublic(fresh));
});

async function handleWebhook(req, res) {
  try {
    await billingService.processWebhook(req);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Paystack webhook error:', e.message);
    res.status(e.statusCode >= 400 ? e.statusCode : 400).json({
      message: e.message
    });
  }
}

module.exports = {
  initializeProCheckout,
  getSubscriptionSummary,
  handleWebhook
};
