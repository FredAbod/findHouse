const mongoose = require('mongoose');

/**
 * Per-user viewing history. One row per user+property, with `count` bumped on
 * each revisit — that repeat count is what lets the app say "3rd time" and
 * offer a saved search built from behaviour rather than a form.
 */
const recentViewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true
    },
    count: { type: Number, default: 1, min: 1 },
    viewedAt: { type: Date, default: Date.now }
  },
  { timestamps: true, versionKey: false }
);

recentViewSchema.index({ user: 1, property: 1 }, { unique: true });
recentViewSchema.index({ user: 1, viewedAt: -1 });

module.exports = mongoose.model('RecentView', recentViewSchema);
