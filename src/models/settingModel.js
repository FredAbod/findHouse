const mongoose = require('mongoose');

/**
 * Operator-tunable platform settings — one document per key, edited from the
 * admin dashboard so changing a payout does not need a redeploy.
 *
 * Every key falls back to an environment variable, and then to a hard default,
 * so a fresh database behaves sensibly with no admin action.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Setting', settingSchema);
