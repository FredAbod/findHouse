const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const {
  submitContactForm,
  getTicket,
  getTicketsByEmail,
  updateTicketStatus,
  addTicketResponse
} = require('../controllers/supportController');
const { protect } = require('../middleware/authMiddleware');

// Rate limiting - 5 submissions per hour per IP
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { 
    success: false, 
    error: 'Too many submissions. Please try again in 5 minutes.' 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware
const validateContact = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s\-\.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and periods'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address')
    .isLength({ max: 254 })
    .withMessage('Email address is too long'),
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters')
];

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorDetails = {};
    errors.array().forEach(error => {
      errorDetails[error.path] = error.msg;
    });
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorDetails
    });
  }
  next();
};

// Public routes
router.post('/contact', contactLimiter, validateContact, handleValidationErrors, submitContactForm);

// Protected routes (for admin)
router.get('/tickets/:ticketId', protect, getTicket);
router.get('/tickets/email/:email', protect, getTicketsByEmail);
router.put('/tickets/:ticketId/status', protect, updateTicketStatus);
router.post('/tickets/:ticketId/responses', protect, addTicketResponse);

module.exports = router;
