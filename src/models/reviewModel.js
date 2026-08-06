const mongoose = require('mongoose');

/**
 * Two-sided reputation — the thing no competitor in this market carries.
 * A review is always about a user (the landlord or the tenant), optionally
 * anchored to the property the tenancy ran on.
 */
const reviewSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      default: null
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, default: '', maxlength: 1000 },
    /** e.g. "tenant 2024–26" — shown under the reviewer's name. */
    relationship: { type: String, default: '' }
  },
  { timestamps: true, versionKey: false }
);

reviewSchema.index({ subject: 1, createdAt: -1 });
reviewSchema.index({ author: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
