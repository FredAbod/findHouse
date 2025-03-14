const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getUserProperties,
  getUserFavorites,
  changePassword // Add this line
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/:id')
  .get(getUserProfile)
  .put(protect, updateUserProfile);

router.get('/:id/properties', getUserProperties);
router.get('/:id/favorites', protect, getUserFavorites);

// Add new route for changing password
router.put('/:id/change-password', protect, changePassword);

module.exports = router;
