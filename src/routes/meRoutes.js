const express = require('express');
const router = express.Router();
const {
  listSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  getMatchAlert,
  listRecentViews,
  clearRecentViews,
  getMyFavorites,
  getProfileStats
} = require('../controllers/engagementController');
const { protect } = require('../middleware/authMiddleware');

/** Everything scoped to the signed-in user, so the client never needs its own id. */
router.use(protect);

router.get('/favorites', getMyFavorites);
router.get('/stats', getProfileStats);

router.route('/searches').get(listSavedSearches).post(createSavedSearch);
router.route('/searches/:id').put(updateSavedSearch).delete(deleteSavedSearch);
router.get('/match-alert', getMatchAlert);

router.route('/recently-viewed').get(listRecentViews).delete(clearRecentViews);

module.exports = router;
