const mongoose = require('mongoose');

/**
 * A stored query plus alert preference. The cron job compares `lastRunAt`
 * against new stock and raises a `matches` notification when the search picks
 * up listings the user has not been told about.
 */
const savedSearchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    /** Human label shown on the chip, e.g. "Lekki 2 bed under ₦2M". */
    label: { type: String, required: true },
    filters: {
      state: String,
      city: String,
      category: String,
      type: String,
      bedrooms: Number,
      minPrice: Number,
      maxPrice: Number,
      verifiedOnly: Boolean,
      noAgentFee: Boolean
    },
    alertsEnabled: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: Date.now },
    lastMatchCount: { type: Number, default: 0 }
  },
  { timestamps: true, versionKey: false }
);

savedSearchSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
