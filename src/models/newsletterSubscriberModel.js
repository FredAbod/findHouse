const mongoose = require('mongoose');

const newsletterSubscriberSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'unsubscribed', 'bounced'],
    default: 'pending'
  },
  source: {
    type: String,
    enum: ['blog', 'footer', 'popup', 'landing', 'unknown'],
    default: 'unknown'
  },
  confirmToken: {
    type: String,
    index: true
  },
  ipAddress: String,
  userAgent: String,
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  confirmedAt: Date,
  unsubscribedAt: Date,
  tags: [String],
  preferences: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'weekly'
    },
    topics: [String]
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
newsletterSubscriberSchema.index({ status: 1, subscribedAt: -1 });
newsletterSubscriberSchema.index({ confirmToken: 1 });

const NewsletterSubscriber = mongoose.model('NewsletterSubscriber', newsletterSubscriberSchema);
module.exports = NewsletterSubscriber;
