const asyncHandler = require('express-async-handler');
const propertyService = require('../services/propertyService');
const billingService = require('../services/billingService');
const Property = require('../models/propertyModel');
const { PROPERTY_OWNER_UPDATE_FIELDS } = require('../constants/propertyUpdateFields');

function pickAllowedPropertyBody(body) {
  const sanitized = {};
  for (const key of PROPERTY_OWNER_UPDATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sanitized[key] = body[key];
    }
  }
  return sanitized;
}

const getMyProperties = asyncHandler(async (req, res) => {
  const list = await propertyService.getMyProperties(req.user._id);
  res.json(list);
});

const getProperties = asyncHandler(async (req, res) => {
  const userId = req.user?._id; // Will be undefined for non-authenticated requests
  const result = await propertyService.getProperties(
    req.query,
    parseInt(req.query.page),
    parseInt(req.query.limit),
    userId
  );
  res.json(result);
});

const getPropertyById = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const property = await propertyService.getPropertyById(req.params.id, userId);
  res.json(property);
});

const createProperty = asyncHandler(async (req, res) => {
  await billingService.assertCanCreateListing(req.user);
  const body = pickAllowedPropertyBody(req.body);
  const property = await propertyService.createProperty(body, req.user._id);
  res.status(201).json(property);
});

const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property || property.deletedAt) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (property.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this property');
  }

  const sanitizedBody = pickAllowedPropertyBody(req.body);
  const updatedProperty = await Property.findByIdAndUpdate(
    req.params.id,
    sanitizedBody,
    { new: true, runValidators: true }
  ).populate('owner', 'name email');

  res.json(updatedProperty);
});

const deleteProperty = asyncHandler(async (req, res) => {
  const result = await propertyService.softDeleteProperty(
    req.params.id,
    req.user._id.toString()
  );
  res.json(result);
});

const searchProperties = asyncHandler(async (req, res) => {
  const searchQuery = req.query.q;
  const properties = await propertyService.searchProperties(searchQuery);
  res.json(properties);
});

const toggleLike = asyncHandler(async (req, res) => {
  const property = await propertyService.toggleLikeAndFavorite(req.params.id, req.user._id);
  res.json(property);
});

const hideProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property || property.deletedAt) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (property.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to hide this property');
  }

  property.isHidden = true;
  property.featured = false;
  property.featuredUntil = null;
  await property.save();

  res.json({ message: 'Property hidden successfully', property });
});

const unhideProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property || property.deletedAt) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (property.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to unhide this property');
  }

  property.isHidden = false;
  await property.save();

  res.json({ message: 'Property unhidden successfully', property });
});

// @desc    Update property rental status
// @route   PATCH /api/properties/:id/status
// @access  Private (owner only)
const updatePropertyStatus = asyncHandler(async (req, res) => {
  const { status, rentedUntil } = req.body;

  if (!status) {
    res.status(400);
    throw new Error('Status is required');
  }

  const updatedProperty = await propertyService.updatePropertyStatus(
    req.params.id,
    req.user._id,
    { status, rentedUntil }
  );

  res.json({
    message: `Property status updated to ${status}`,
    property: updatedProperty
  });
});

const patchFeatured = asyncHandler(async (req, res) => {
  const raw = req.body?.featured;
  const featured =
    typeof raw === 'boolean' ? raw : String(raw).toLowerCase() === 'true';

  const updatedProperty = await propertyService.setFeaturedStatus(
    req.params.id,
    req.user._id,
    featured
  );

  res.json(updatedProperty);
});

const getPropertyAnalytics = asyncHandler(async (req, res) => {
  const data = await propertyService.getOwnerPropertyAnalytics(
    req.params.id,
    req.user._id
  );
  res.json(data);
});

module.exports = {
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
  getPropertyAnalytics
};
