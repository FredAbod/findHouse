const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['sale', 'rent'],
    required: true
  },
  category: {
    type: String,
    enum: ['apartment', 'house', 'land', 'commercial', 'studio', 'villa'],
    required: true
  },
  bedrooms: {
    type: Number,
    required: true
  },
  bathrooms: {
    type: Number,
    required: true
  },
  location: {
    state: String,
    city: String,
    address: String
  },
  features: [{
    type: String
  }],
  images: [{
    type: String  // Store only the cloudinary URL
  }],
  videoUrl: {
    type: String  // Store Google Drive video URL
  },
  videoUploadStatus: {
    type: String,
    enum: ['none', 'processing', 'completed', 'failed'],
    default: 'none'
  },
  isHidden: {
    type: Boolean,
    default: false
  },
  /** Soft-delete: when set, property is excluded from all public reads; owner may still see in dashboard. */
  deletedAt: {
    type: Date,
    default: null
  },
  // Rental Status fields
  status: {
    type: String,
    enum: ['available', 'pending', 'rented'],
    default: 'available'
  },
  rentedAt: {
    type: Date
  },
  rentedUntil: {
    type: Date
  },
  currentTenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

propertySchema.index({ title: 'text', description: 'text' });
propertySchema.index({ deletedAt: 1, isHidden: 1, createdAt: -1 });
propertySchema.index({ 'location.state': 1, 'location.city': 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ owner: 1, deletedAt: 1, isHidden: 1 });

const Property = mongoose.model('Property', propertySchema);
module.exports = Property;
