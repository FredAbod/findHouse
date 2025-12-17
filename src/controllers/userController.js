const asyncHandler = require('express-async-handler');
const userService = require('../services/userService');
const verificationService = require('../services/verificationService');

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserProfile(req.params.id);
  res.json(user);
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateUserProfile(req.params.id, req.body, req.user._id);
  res.json(user);
});

const getUserProperties = asyncHandler(async (req, res) => {
  const properties = await userService.getUserProperties(req.params.id);
  res.json(properties);
});

const getUserFavorites = asyncHandler(async (req, res) => {
  const favorites = await userService.getUserFavorites(req.params.id);
  res.json(favorites);
});

// Add new controller method for changing password
const changePassword = asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    res.status(400);
    throw new Error('Passwords do not match');
  }
  await userService.changePassword(req.params.id, password, req.user._id);
  res.json({ message: 'Password updated successfully' });
});

const requestVerification = asyncHandler(async (req, res) => {
  const user = await userService.requestVerification(req.user._id);
  res.json(user);
});

// @desc    Submit verification request with ID documents
// @route   POST /api/users/verification/submit
// @access  Private
const submitVerification = asyncHandler(async (req, res) => {
  const { idType, idNumber, documentUrl } = req.body;

  if (!idType || !idNumber) {
    res.status(400);
    throw new Error('ID type and ID number are required');
  }

  const result = await verificationService.submitVerification(
    req.user._id,
    { idType, idNumber },
    documentUrl
  );

  res.status(201).json(result);
});

// @desc    Get verification status
// @route   GET /api/users/verification/status
// @access  Private
const getVerificationStatus = asyncHandler(async (req, res) => {
  const status = await verificationService.getVerificationStatus(req.user._id);
  res.json(status);
});

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserProperties,
  getUserFavorites,
  changePassword,
  requestVerification,
  submitVerification,
  getVerificationStatus
};
