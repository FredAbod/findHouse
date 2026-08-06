const asyncHandler = require('express-async-handler');
const engagementService = require('../services/engagementService');
const ownerAnalyticsService = require('../services/ownerAnalyticsService');
const userService = require('../services/userService');
const referralService = require('../services/referralService');
const settingsService = require('../services/settingsService');

/* ------------------------------------------------------------------ notifications */

const listNotifications = asyncHandler(async (req, res) => {
  res.json(await engagementService.listNotifications(req.user._id, req.query));
});

const markNotificationRead = asyncHandler(async (req, res) => {
  res.json(await engagementService.markNotificationRead(req.user._id, req.params.id));
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  res.json(await engagementService.markAllNotificationsRead(req.user._id));
});

/* ----------------------------------------------------------------- saved searches */

const listSavedSearches = asyncHandler(async (req, res) => {
  res.json(await engagementService.listSavedSearches(req.user._id));
});

const createSavedSearch = asyncHandler(async (req, res) => {
  res.status(201).json(await engagementService.createSavedSearch(req.user._id, req.body));
});

const updateSavedSearch = asyncHandler(async (req, res) => {
  res.json(await engagementService.updateSavedSearch(req.user._id, req.params.id, req.body));
});

const deleteSavedSearch = asyncHandler(async (req, res) => {
  res.json(await engagementService.deleteSavedSearch(req.user._id, req.params.id));
});

const getMatchAlert = asyncHandler(async (req, res) => {
  res.json({ alert: await engagementService.topMatchAlert(req.user._id) });
});

/* ---------------------------------------------------------------- recently viewed */

const listRecentViews = asyncHandler(async (req, res) => {
  res.json(await engagementService.listRecentViews(req.user._id, req.query.limit));
});

const clearRecentViews = asyncHandler(async (req, res) => {
  res.json(await engagementService.clearRecentViews(req.user._id));
});

/* ------------------------------------------------------------------------ profile */

const getMyFavorites = asyncHandler(async (req, res) => {
  res.json(await userService.getUserFavorites(req.user._id));
});

const getProfileStats = asyncHandler(async (req, res) => {
  res.json(await engagementService.profileStats(req.user._id));
});

/* ------------------------------------------------------------------------ reviews */

const listReviews = asyncHandler(async (req, res) => {
  const [reviews, summary] = await Promise.all([
    engagementService.listReviews(req.params.userId),
    engagementService.reviewSummary(req.params.userId)
  ]);
  res.json({ reviews, summary });
});

const createReview = asyncHandler(async (req, res) => {
  res.status(201).json(await engagementService.createReview(req.user._id, req.body));
});

/* ------------------------------------------------------------------------ reports */

const reportListing = asyncHandler(async (req, res) => {
  res.status(201).json(await engagementService.reportListing(req.user?._id, req.params.id, req.body));
});

/* -------------------------------------------------------------------- discovery */

const suggestAreas = asyncHandler(async (req, res) => {
  res.json(await engagementService.suggestAreas(req.query));
});

const topCities = asyncHandler(async (req, res) => {
  res.json(await engagementService.topCities(req.query.limit));
});

/* ------------------------------------------------------------------- analytics */

const ownerOverview = asyncHandler(async (req, res) => {
  res.json(await ownerAnalyticsService.overview(req.user._id, req.query.range));
});

const priceGuidance = asyncHandler(async (req, res) => {
  res.json(await ownerAnalyticsService.priceGuidance(req.query));
});

/** Rent trend for an area — public, it is a reason to come back. */
const priceTrend = asyncHandler(async (req, res) => {
  res.json(await ownerAnalyticsService.priceTrend(req.query));
});

/* ----------------------------------------------------------------- referrals */

const getReferralSummary = asyncHandler(async (req, res) => {
  res.json(await referralService.summary(req.user._id));
});

/* ------------------------------------------------------------------ settings */

/** Public subset: the app needs the bonus figure to render the share sheet. */
const getPublicSettings = asyncHandler(async (req, res) => {
  res.json({
    referralBonus: await settingsService.get('referralBonus'),
    proMonthlyPrice: await settingsService.get('proMonthlyPrice'),
    proYearlyPrice: await settingsService.get('proYearlyPrice')
  });
});

/* --------------------------------------------------------- admin: settings */

const adminGetSettings = asyncHandler(async (req, res) => {
  res.json(await settingsService.all());
});

const adminUpdateSetting = asyncHandler(async (req, res) => {
  res.json(await settingsService.set(req.params.key, req.body.value, req.user._id));
});

/* -------------------------------------------------------- admin: referrals */

const adminListReferrals = asyncHandler(async (req, res) => {
  res.json(await referralService.listForAdmin(req.query));
});

const adminMarkReferralPaid = asyncHandler(async (req, res) => {
  res.json(await referralService.markPaid(req.params.id, req.user._id, req.body.payoutReference));
});

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  listSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch,
  getMatchAlert,
  listRecentViews,
  clearRecentViews,
  getMyFavorites,
  getProfileStats,
  listReviews,
  createReview,
  reportListing,
  suggestAreas,
  topCities,
  ownerOverview,
  priceGuidance,
  priceTrend,
  getReferralSummary,
  getPublicSettings,
  adminGetSettings,
  adminUpdateSetting,
  adminListReferrals,
  adminMarkReferralPaid
};
