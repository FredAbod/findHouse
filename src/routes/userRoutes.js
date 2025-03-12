const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getUserProperties,
  getUserFavorites
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.route('/:id')
  .get(getUserProfile)
  .put(protect, updateUserProfile);

router.get('/:id/properties', getUserProperties);
router.get('/:id/favorites', protect, getUserFavorites);

module.exports = router;
