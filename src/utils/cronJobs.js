const cron = require('node-cron');
const User = require('../models/userModel');
const Property = require('../models/propertyModel');
const Booking = require('../models/bookingModel');
const Analytics = require('../models/analyticsModel');

/**
 * Initialize all cron jobs
 */
function initCronJobs() {
  // Daily analytics job - runs at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily analytics cron job...');
    await generateDailyAnalytics();
  });

  // Optional: Weekly cleanup of old activity logs (runs Sunday at 2 AM)
  cron.schedule('0 2 * * 0', async () => {
    console.log('Running weekly cleanup cron job...');
    await cleanupOldActivityLogs();
  });

  console.log('Cron jobs initialized');
}

/**
 * Generate daily analytics for the previous day
 */
async function generateDailyAnalytics() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if analytics for yesterday already exists
    const existing = await Analytics.findOne({ date: yesterday });
    if (existing) {
      console.log('Analytics for yesterday already exists, skipping...');
      return;
    }

    // Count metrics for yesterday
    const [newUsers, newProperties, newBookings, completedRentals] = await Promise.all([
      User.countDocuments({
        createdAt: { $gte: yesterday, $lt: today }
      }),
      Property.countDocuments({
        createdAt: { $gte: yesterday, $lt: today }
      }),
      Booking.countDocuments({
        createdAt: { $gte: yesterday, $lt: today }
      }),
      Booking.countDocuments({
        status: 'completed',
        updatedAt: { $gte: yesterday, $lt: today }
      })
    ]);

    // Get verification requests count
    const verificationRequests = await User.countDocuments({
      'verification.submittedAt': { $gte: yesterday, $lt: today }
    });

    // Create analytics record
    await Analytics.create({
      date: yesterday,
      metrics: {
        newUsers,
        newProperties,
        newBookings,
        completedRentals,
        verificationRequests
      }
    });

    console.log(`Daily analytics generated for ${yesterday.toISOString().split('T')[0]}:`, {
      newUsers,
      newProperties,
      newBookings,
      completedRentals,
      verificationRequests
    });
  } catch (error) {
    console.error('Error generating daily analytics:', error);
  }
}

/**
 * Clean up old activity logs (older than 90 days)
 */
async function cleanupOldActivityLogs() {
  try {
    const Activity = require('../models/activityModel');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await Activity.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    console.log(`Cleaned up ${result.deletedCount} old activity logs`);
  } catch (error) {
    console.error('Error cleaning up activity logs:', error);
  }
}

/**
 * Manually trigger analytics generation (useful for testing or backfilling)
 * @param {Date} date - The date to generate analytics for
 */
async function generateAnalyticsForDate(date) {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const [newUsers, newProperties, newBookings, completedRentals] = await Promise.all([
    User.countDocuments({
      createdAt: { $gte: targetDate, $lt: nextDay }
    }),
    Property.countDocuments({
      createdAt: { $gte: targetDate, $lt: nextDay }
    }),
    Booking.countDocuments({
      createdAt: { $gte: targetDate, $lt: nextDay }
    }),
    Booking.countDocuments({
      status: 'completed',
      updatedAt: { $gte: targetDate, $lt: nextDay }
    })
  ]);

  const verificationRequests = await User.countDocuments({
    'verification.submittedAt': { $gte: targetDate, $lt: nextDay }
  });

  return await Analytics.findOneAndUpdate(
    { date: targetDate },
    {
      metrics: {
        newUsers,
        newProperties,
        newBookings,
        completedRentals,
        verificationRequests
      }
    },
    { upsert: true, new: true }
  );
}

module.exports = {
  initCronJobs,
  generateDailyAnalytics,
  generateAnalyticsForDate,
  cleanupOldActivityLogs
};
