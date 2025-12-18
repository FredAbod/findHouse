const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: [
      'user_signup',
      'property_listed',
      'property_updated',
      'property_deleted',
      'booking_created',
      'booking_approved',
      'booking_rejected',
      'rental_completed',
      'verification_submitted',
      'verification_approved',
      'verification_rejected',
      'user_login',
      'password_reset',
      'password_reset_request'
    ],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for efficient querying
activitySchema.index({ createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

// Static method to log activity
activitySchema.statics.logActivity = async function(type, userId, metadata = {}, req = null) {
  const activityData = {
    type,
    user: userId,
    metadata
  };

  if (req) {
    activityData.ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    activityData.userAgent = req.get('User-Agent') || 'unknown';
  }

  return await this.create(activityData);
};

// Static method to get recent activity
activitySchema.statics.getRecentActivity = async function(limit = 50, filter = {}) {
  return await this.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

const Activity = mongoose.model('Activity', activitySchema);
module.exports = Activity;
