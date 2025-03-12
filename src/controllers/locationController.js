const asyncHandler = require('express-async-handler');
const locationService = require('../services/locationService');

const getStates = asyncHandler(async (req, res) => {
  const states = locationService.getStates();
  res.json(states);
});

const getCities = asyncHandler(async (req, res) => {
  const cities = locationService.getCities(req.query.state);
  res.json(cities);
});

module.exports = {
  getStates,
  getCities
};
