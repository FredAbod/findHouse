const asyncHandler = require('express-async-handler');
const propertyService = require('../services/propertyService');
const Property = require('../models/propertyModel');

const getProperties = asyncHandler(async (req, res) => {
  const result = await propertyService.getProperties(
    req.query,
    parseInt(req.query.page),
    parseInt(req.query.limit)
  );
  res.json(result);
});

const getPropertyById = asyncHandler(async (req, res) => {
  const property = await propertyService.getPropertyById(req.params.id);
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
    throw new Error('Not authorized');
  }

  const updatedProperty = await Property.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );

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
    throw new Error('Not authorized');
  }

  await property.remove();
  res.json({ message: 'Property removed' });
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
  const property = await Property.findById(req.params.id);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  const index = property.likes.indexOf(req.user._id);
  if (index === -1) {
    property.likes.push(req.user._id);
  } else {
    property.likes.splice(index, 1);
  }

  await property.save();
  res.json(property);
});

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  searchProperties,
  toggleLike
};
