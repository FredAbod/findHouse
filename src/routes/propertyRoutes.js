const express = require('express');
const router = express.Router();
const {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
  toggleLike,
  hideProperty,
  unhideProperty,
  updatePropertyStatus
} = require('../controllers/propertyController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.route('/')
  .get(optionalAuth, getProperties) // Use optionalAuth middleware here
  .post(protect, createProperty);

router.get('/search', optionalAuth, searchProperties);

router.route('/:id')
  .get(optionalAuth, getPropertyById)
  .put(protect, updateProperty)
  .delete(protect, deleteProperty);

router.post('/:id/like', protect, toggleLike);
router.patch('/:id/hide', protect, hideProperty);
router.patch('/:id/unhide', protect, unhideProperty);
router.patch('/:id/status', protect, updatePropertyStatus);

module.exports = router;
