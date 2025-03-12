const asyncHandler = require('express-async-handler');
const userService = require('../services/userService');

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

module.exports = {
  getUserProfile,
  updateUserProfile,
  getUserProperties,
  getUserFavorites
};
