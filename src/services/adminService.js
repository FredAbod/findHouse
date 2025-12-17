const User = require('../models/userModel');
const Property = require('../models/propertyModel');
const Booking = require('../models/bookingModel');
const Activity = require('../models/activityModel');
const Analytics = require('../models/analyticsModel');

class AdminService {
  // Get analytics overview
  async getAnalytics(period = '30d') {
    const periodDays = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Get totals
    const [
      totalUsers,
      totalProperties,
      totalBookings,
      pendingVerifications
    ] = await Promise.all([
      User.countDocuments({}),
      Property.countDocuments({ isHidden: { $ne: true } }),
      Booking.countDocuments({}),
      User.countDocuments({ 'verification.status': 'pending' })
    ]);

    // Get new counts for the period
    const [
      newUsers,
      newProperties,
      newBookings,
      completedRentals
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: startDate } }),
      Property.countDocuments({ createdAt: { $gte: startDate } }),
      Booking.countDocuments({ createdAt: { $gte: startDate } }),
      Booking.countDocuments({ 
        status: 'completed',
        updatedAt: { $gte: startDate }
      })
    ]);

    // Get chart data from Analytics collection
    const analyticsData = await Analytics.getAnalytics(startDate, endDate);

    // Generate chart data
    const chartData = {
      signups: [],
      rentals: [],
      properties: [],
      bookings: []
    };

    // Aggregate by date from Activity collection if Analytics is empty
    if (analyticsData.length === 0) {
      // Generate data from Activity logs
      const signupsByDate = await Activity.aggregate([
        {
          $match: {
            type: 'user_signup',
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      const rentalsByDate = await Activity.aggregate([
        {
          $match: {
            type: 'rental_completed',
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      chartData.signups = signupsByDate.map(item => ({
        date: item._id,
        count: item.count
      }));

      chartData.rentals = rentalsByDate.map(item => ({
        date: item._id,
        count: item.count
      }));
    } else {
      chartData.signups = analyticsData.map(a => ({
        date: a.date.toISOString().split('T')[0],
        count: a.metrics.newUsers
      }));
      chartData.rentals = analyticsData.map(a => ({
        date: a.date.toISOString().split('T')[0],
        count: a.metrics.completedRentals
      }));
    }

    return {
      period: `${periodDays}d`,
      totalUsers,
      newUsers,
      totalProperties,
      newProperties,
      totalBookings,
      newBookings,
      completedRentals,
      pendingVerifications,
      chartData
    };
  }

  // Get recent activity feed
  async getRecentActivity(limit = 50, type = null) {
    const filter = type ? { type } : {};
    
    const activities = await Activity.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    return activities.map(activity => ({
      id: activity._id,
      type: activity.type,
      user: activity.user ? {
        id: activity.user._id,
        name: activity.user.name,
        email: activity.user.email
      } : null,
      timestamp: activity.createdAt,
      metadata: activity.metadata,
      message: this.formatActivityMessage(activity)
    }));
  }

  // Format activity message for display
  formatActivityMessage(activity) {
    const userName = activity.user?.name || 'Unknown User';
    
    switch (activity.type) {
      case 'user_signup':
        return `${userName} signed up`;
      case 'property_listed':
        return `${userName} listed a new property: ${activity.metadata?.propertyTitle || 'N/A'}`;
      case 'property_updated':
        return `${userName} updated property: ${activity.metadata?.propertyTitle || 'N/A'}`;
      case 'property_deleted':
        return `${userName} deleted a property`;
      case 'booking_created':
        return `${userName} created a booking request`;
      case 'booking_approved':
        return `${userName} approved a booking`;
      case 'booking_rejected':
        return `${userName} rejected a booking`;
      case 'rental_completed':
        return `Rental completed: ${activity.metadata?.propertyTitle || 'N/A'}`;
      case 'verification_submitted':
        return `${userName} submitted verification request (${activity.metadata?.idType})`;
      case 'verification_approved':
        return `Verification approved for ${activity.metadata?.userName || 'a user'}`;
      case 'verification_rejected':
        return `Verification rejected for ${activity.metadata?.userName || 'a user'}`;
      case 'user_login':
        return `${userName} logged in`;
      default:
        return `${userName} performed action: ${activity.type}`;
    }
  }

  // Get user login history
  async getUserLoginHistory(userId, limit = 50) {
    const user = await User.findById(userId)
      .select('name email loginHistory lastLoginAt');

    if (!user) throw new Error('User not found');

    // Sort login history by timestamp (newest first) and limit
    const loginHistory = (user.loginHistory || [])
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        lastLoginAt: user.lastLoginAt
      },
      loginHistory: loginHistory.map(entry => ({
        timestamp: entry.timestamp,
        ipAddress: entry.ipAddress ? this.maskIpAddress(entry.ipAddress) : 'N/A',
        userAgent: entry.userAgent || 'N/A'
      }))
    };
  }

  // Mask IP address for privacy (show only partial)
  maskIpAddress(ip) {
    if (!ip) return 'N/A';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.x.x`;
    }
    return ip.substring(0, ip.length / 2) + '...';
  }

  // Get all users with filtering and pagination
  async getUsers(page = 1, limit = 20, filters = {}) {
    const skip = (page - 1) * limit;
    const query = {};

    if (filters.role) query.role = filters.role;
    if (filters.verificationStatus) {
      query['verification.status'] = filters.verificationStatus;
    }
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -loginHistory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    return {
      users: users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        verificationStatus: user.verification?.status || 'unverified',
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      })),
      page,
      pages: Math.ceil(total / limit),
      total
    };
  }

  // Get dashboard summary (quick stats for dashboard)
  async getDashboardSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalProperties,
      totalBookings,
      pendingVerifications,
      todaySignups,
      todayBookings,
      activeListings,
      rentedProperties
    ] = await Promise.all([
      User.countDocuments({}),
      Property.countDocuments({}),
      Booking.countDocuments({}),
      User.countDocuments({ 'verification.status': 'pending' }),
      User.countDocuments({ createdAt: { $gte: today } }),
      Booking.countDocuments({ createdAt: { $gte: today } }),
      Property.countDocuments({ 
        isHidden: { $ne: true },
        status: { $ne: 'rented' }
      }),
      Property.countDocuments({ status: 'rented' })
    ]);

    return {
      stats: {
        totalUsers,
        totalProperties,
        totalBookings,
        pendingVerifications,
        activeListings,
        rentedProperties
      },
      today: {
        signups: todaySignups,
        bookings: todayBookings
      }
    };
  }
}

module.exports = new AdminService();
