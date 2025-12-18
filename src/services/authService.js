const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const Analytics = require('../models/analyticsModel');
const emailService = require('./emailService');

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

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return { message: 'If an account with that email exists, a reset link has been sent.' };
    }

    // Check if user is active
    if (user.isActive === false) {
      throw new Error('This account has been deactivated. Please contact support.');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before storing (security best practice)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Save hashed token and expiry (1 hour)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Create reset URL (using unhashed token)
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email
    try {
      await emailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl
      });
    } catch (error) {
      // If email fails, clear the reset token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      throw new Error('Error sending email. Please try again later.');
    }

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(token, newPassword) {
    // Hash the provided token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Validate password length
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Log activity
    await Activity.logActivity('password_reset', user._id, {
      email: user.email
    });

    return { message: 'Password reset successful' };
  }
}

module.exports = new AuthService();
