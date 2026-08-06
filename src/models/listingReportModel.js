const mongoose = require('mongoose');

const REPORT_REASONS = [
  'inspection_fee',
  'fake_photos',
  'already_rented',
  'wrong_price',
  'agent_posing_as_owner',
  'other'
];

/**
 * Anti-scam reports. Two confirmed reports auto-hide the listing pending
 * review — that promise is what makes people bother reporting, so it is
 * enforced here rather than left to a moderator queue.
 */
const listingReportSchema = new mongoose.Schema(
  {
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: true,
      index: true
    },
    /** Kept for de-duplication and follow-up; never exposed to the owner. */
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    detail: { type: String, default: '', maxlength: 2000 },
    evidenceUrl: { type: String, default: null },
    status: {
      type: String,
      enum: ['open', 'upheld', 'dismissed'],
      default: 'open'
    }
  },
  { timestamps: true, versionKey: false }
);

listingReportSchema.index({ property: 1, reporter: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ListingReport', listingReportSchema);
module.exports.REPORT_REASONS = REPORT_REASONS;
