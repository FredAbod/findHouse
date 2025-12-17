const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const Analytics = require('../models/analyticsModel');

class AuthService {
  generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  }

  async register(userData, req = null) {
    if (await User.findOne({ email: userData.email })) {
      throw new Error('User already exists');
    }

    const user = await User.create(userData);

    // Log activity and update analytics
    await Promise.all([
      Activity.logActivity('user_signup', user._id, {
        email: user.email
      }, req),
      Analytics.incrementMetric('newUsers')
    ]);

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      verificationStatus: user.verification?.status || 'unverified',
      token: this.generateToken(user._id)
    };
  }

  async login(email, password, req = null) {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      // Update login tracking
      const loginEntry = {
        timestamp: new Date(),
        ipAddress: req?.ip || req?.connection?.remoteAddress || 'unknown',
        userAgent: req?.get?.('User-Agent') || 'unknown'
      };

      // Add to login history (keep last 100 entries)
      user.loginHistory = user.loginHistory || [];
      user.loginHistory.unshift(loginEntry);
      if (user.loginHistory.length > 100) {
        user.loginHistory = user.loginHistory.slice(0, 100);
      }
      user.lastLoginAt = new Date();
      await user.save();

      // Log activity (optional - can be disabled for privacy)
      await Activity.logActivity('user_login', user._id, {}, req);

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        verificationStatus: user.verification?.status || 'unverified',
        token: this.generateToken(user._id)
      };
    }
    throw new Error('Invalid email or password');
  }
}

module.exports = new AuthService();
