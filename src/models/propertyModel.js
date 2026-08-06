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
    address: String,
    /** Set by dragging the pin to the exact gate in the mobile upload wizard. */
    lat: Number,
    lng: Number
  },
  /** Security deposit, in naira. Disclosed up front — hiding it is the #1 tenant complaint. */
  caution: {
    type: Number,
    default: 0,
    min: 0
  },
  /** Annual service charge, in naira. */
  serviceCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  /** Square metres. */
  floorArea: {
    type: Number,
    min: 0
  },
  /** Free text as entered by the owner, e.g. "1 September" or "Immediately". */
  availableFrom: {
    type: String,
    default: 'Immediately'
  },
  /** Surfaced to tenants as a green badge. */
  noAgentFee: {
    type: Boolean,
    default: true
  },
  serviced: {
    type: Boolean,
    default: false
  },
  /** Owner accepts quarterly/monthly instalments. */
  instalmentsAccepted: {
    type: Boolean,
    default: false
  },
  /** Open anti-scam reports; two auto-hides the listing pending review. */
  reportCount: {
    type: Number,
    default: 0,
    min: 0
  },
  hiddenByReports: {
    type: Boolean,
    default: false
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
  }],
  /** Pro / privileged: surfaced higher in marketplace sort; quota enforced server-side */
  featured: {
    type: Boolean,
    default: false
  },
  featuredUntil: {
    type: Date,
    default: null
  },
  viewCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

propertySchema.index({ title: 'text', description: 'text' });
propertySchema.index({ deletedAt: 1, isHidden: 1, createdAt: -1 });
propertySchema.index({
  deletedAt: 1,
  isHidden: 1,
  featured: -1,
  createdAt: -1
});
propertySchema.index({ 'location.state': 1, 'location.city': 1 });
propertySchema.index({ price: 1 });
propertySchema.index({ owner: 1, deletedAt: 1, isHidden: 1 });
/** Daily free-tier creation counts: owner + createdAt range */
propertySchema.index({ owner: 1, createdAt: -1 });

const Property = mongoose.model('Property', propertySchema);
module.exports = Property;
