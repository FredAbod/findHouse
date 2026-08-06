const mongoose = require('mongoose');

/**
 * One row per person who signed up with someone's code.
 *
 * The bonus is snapshotted onto the row at qualification time rather than read
 * live, so changing the payout in admin never silently rewrites what somebody
 * was already promised.
 */
const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    /** The invitee. One referral per invited user, ever. */
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    code: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'qualified', 'paid', 'void'],
      default: 'pending',
      index: true
    },
    /** What qualified them — a published listing, a Pro subscription, or signup. */
    qualifiedBy: { type: String, default: null },
    qualifiedAt: { type: Date, default: null },
    /** Bonus in naira, fixed at the moment of qualification. */
    bonusAmount: { type: Number, default: 0 },
    paidAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    payoutReference: { type: String, default: null }
  },
  { timestamps: true, versionKey: false }
);

referralSchema.index({ referrer: 1, status: 1 });

module.exports = mongoose.model('Referral', referralSchema);
