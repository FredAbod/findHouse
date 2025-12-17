const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true
  },
  metrics: {
    newUsers: {
      type: Number,
      default: 0
    },
    newProperties: {
      type: Number,
      default: 0
    },
    newBookings: {
      type: Number,
      default: 0
    },
    completedRentals: {
      type: Number,
      default: 0
    },
    verificationRequests: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Static method to increment a metric for today
analyticsSchema.statics.incrementMetric = async function(metricName) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const update = {};
  update[`metrics.${metricName}`] = 1;

  return await this.findOneAndUpdate(
    { date: today },
    { $inc: update },
    { upsert: true, new: true }
  );
};

// Static method to get analytics for a date range
analyticsSchema.statics.getAnalytics = async function(startDate, endDate) {
  return await this.find({
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 });
};

const Analytics = mongoose.model('Analytics', analyticsSchema);
module.exports = Analytics;
