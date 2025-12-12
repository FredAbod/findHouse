const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  subscribe,
  confirmSubscription,
  unsubscribe,
  unsubscribeByEmail,
  getActiveSubscribers,
  getStats
} = require('../controllers/newsletterController');
const { protect } = require('../middleware/authMiddleware');

// Rate limiting - 10 subscriptions per hour per IP
const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { 
    success: false, 
    error: 'Too many signup attempts. Please try again later.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const validateNewsletterSignup = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address')
    .isLength({ max: 254 })
    .withMessage('Email address is too long'),
  body('source')
    .optional()
    .isIn(['blog', 'footer', 'popup', 'landing'])
    .withMessage('Invalid source')
];

const validateUnsubscribeByEmail = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: errors.array()[0].msg
    });
  }
  next();
};

// Public routes
router.post('/subscribe', newsletterLimiter, validateNewsletterSignup, handleValidationErrors, subscribe);
router.get('/confirm/:token', confirmSubscription);
router.get('/unsubscribe/:token', unsubscribe);
router.post('/unsubscribe', validateUnsubscribeByEmail, handleValidationErrors, unsubscribeByEmail);

// Protected routes (for admin)
router.get('/subscribers', protect, getActiveSubscribers);
router.get('/stats', protect, getStats);

module.exports = router;
