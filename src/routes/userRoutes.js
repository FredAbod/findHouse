const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getUserProperties,
  getUserFavorites,
  changePassword,
  requestVerification,
  submitVerification,
  getVerificationStatus
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/:id')
  .get(getUserProfile)
  .put(protect, updateUserProfile);

router.get('/:id/properties', getUserProperties);
router.get('/:id/favorites', protect, getUserFavorites);

// Add new route for changing password
router.put('/:id/change-password', protect, changePassword);

// Verification routes
router.post('/request-verification', protect, requestVerification);
router.post('/verification/submit', protect, submitVerification);
router.get('/verification/status', protect, getVerificationStatus);

module.exports = router;
