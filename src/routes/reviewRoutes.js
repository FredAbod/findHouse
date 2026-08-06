const express = require('express');
const router = express.Router();
const { listReviews, createReview } = require('../controllers/engagementController');
const { protect } = require('../middleware/authMiddleware');

/** Reputation is public — reading a user's reviews needs no auth. */
router.get('/user/:userId', listReviews);
router.post('/', protect, createReview);

module.exports = router;
