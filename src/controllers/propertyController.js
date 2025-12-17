const asyncHandler = require('express-async-handler');
const propertyService = require('../services/propertyService');
const Property = require('../models/propertyModel');

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
  const property = await propertyService.createProperty(req.body, req.user._id);
  res.status(201).json(property);
});

const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (property.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to update this property');
  }

  const updatedProperty = await Property.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('owner', 'name email');

  res.json(updatedProperty);
});

const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (property.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this property');
  }

  await Property.deleteOne({ _id: req.params.id });
  res.json({ message: 'Property deleted successfully', id: req.params.id });
});

const searchProperties = asyncHandler(async (req, res) => {
  const searchQuery = req.query.q;
  const properties = await Property.find(
    { $text: { $search: searchQuery } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .populate('owner', 'name email');

  res.json(properties);
});

const toggleLike = asyncHandler(async (req, res) => {
  const property = await propertyService.toggleLikeAndFavorite(req.params.id, req.user._id);
  res.json(property);
});

const hideProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  if (property.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to hide this property');
  }

  property.isHidden = true;
  await property.save();

  res.json({ message: 'Property hidden successfully', property });
});

const unhideProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);

  if (!property) {
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

module.exports = {
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
};
