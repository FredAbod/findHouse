const mongoose = require('mongoose');

const paymentWebhookEventSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    event: { type: String },
    handled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentWebhookEvent', paymentWebhookEventSchema);
