const express = require('express');
const router = express.Router();
const {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
  toggleLike
} = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getProperties)
  .post(protect, createProperty);

router.get('/search', searchProperties);

router.route('/:id')
  .get(getPropertyById)
  .put(protect, updateProperty)
  .delete(protect, deleteProperty);

router.post('/:id/like', protect, toggleLike);

module.exports = router;
