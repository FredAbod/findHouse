const express = require('express');
const router = express.Router();
const {
  getMyProperties,
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
  toggleLike,
  hideProperty,
  unhideProperty,
  updatePropertyStatus,
  patchFeatured,
  getPropertyAnalytics,
  recordPropertyView
} = require('../controllers/propertyController');
const {
  suggestAreas,
  topCities,
  reportListing,
  ownerOverview,
  priceGuidance,
  priceTrend
} = require('../controllers/engagementController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

router.route('/')
  .get(optionalAuth, getProperties) // Use optionalAuth middleware here
  .post(protect, createProperty);

router.get('/search', optionalAuth, searchProperties);

// Discovery helpers — declared above /:id so they aren't swallowed by it.
router.get('/areas', suggestAreas);
router.get('/cities', topCities);
router.get('/price-guidance', protect, priceGuidance);
router.get('/price-trend', priceTrend);

router.get('/my-properties', protect, getMyProperties);

// Owner analytics rolled up across every listing they own.
router.get('/analytics/overview', protect, ownerOverview);

router.get('/:id/analytics', protect, getPropertyAnalytics);
router.patch('/:id/feature', protect, patchFeatured);

router.route('/:id')
  .get(optionalAuth, getPropertyById)
  .put(protect, updateProperty)
  .delete(protect, deleteProperty);

router.post('/:id/like', protect, toggleLike);
router.post('/:id/view', protect, recordPropertyView);
router.post('/:id/report', protect, reportListing);
router.patch('/:id/hide', protect, hideProperty);
router.patch('/:id/unhide', protect, unhideProperty);
router.patch('/:id/status', protect, updatePropertyStatus);

module.exports = router;
