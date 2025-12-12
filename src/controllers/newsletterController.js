const asyncHandler = require('express-async-handler');
const newsletterService = require('../services/newsletterService');

const subscribe = asyncHandler(async (req, res) => {
  const { email, source } = req.body;
  
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('user-agent');

  const result = await newsletterService.subscribe(email, source, ipAddress, userAgent);

  if (result.statusCode) {
    res.status(result.statusCode);
  }

  res.json({
    success: result.success,
    message: result.message,
    ...(result.error && { error: result.error }),
    ...(result.email && { email: result.email })
  });
});

const confirmSubscription = asyncHandler(async (req, res) => {
  const { token } = req.params;
  
  const result = await newsletterService.confirmSubscription(token);

  if (result.statusCode) {
    res.status(result.statusCode);
  }

  res.json(result);
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { token } = req.params;
  
  const result = await newsletterService.unsubscribe(token);

  if (result.statusCode) {
    res.status(result.statusCode);
  }

  res.json(result);
});

const unsubscribeByEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const result = await newsletterService.unsubscribeByEmail(email);

  if (result.statusCode) {
    res.status(result.statusCode);
  }

  res.json(result);
});

const getActiveSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await newsletterService.getActiveSubscribers();
  res.json({ subscribers, count: subscribers.length });
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await newsletterService.getSubscriberStats();
  res.json(stats);
});

module.exports = {
  subscribe,
  confirmSubscription,
  unsubscribe,
  unsubscribeByEmail,
  getActiveSubscribers,
  getStats
};
