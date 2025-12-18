const User = require('../models/userModel');
const Property = require('../models/propertyModel');

class UserService {
  async getUserProfile(userId) {
    const user = await User.findById(userId).select('-password -loginHistory');
    if (!user) throw new Error('User not found');
    
    // Return user with verification status
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      verificationStatus: user.verification?.status || 'unverified',
      verifiedAt: user.verifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async updateUserProfile(userId, updateData, currentUserId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    // Ensure proper comparison of user IDs
    if (user._id.toString() !== currentUserId.toString()) throw new Error('Not authorized');

    Object.assign(user, updateData);
    const updatedUser = await user.save();
    
    return {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone
    };
  }

  async getUserProperties(userId) {
    return await Property.find({ owner: userId });
  }

  async getUserFavorites(userId) {
    const user = await User.findById(userId).populate('favoriteProperties');
    return user.favoriteProperties;
  }

  async changePassword(userId, newPassword, currentUserId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    if (user._id.toString() !== currentUserId.toString()) throw new Error('Not authorized');

    user.password = newPassword;
    await user.save();
  }

  async requestVerification(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Check if already verified
    if (user.isVerified) {
      throw new Error('User is already verified');
    }

    // Check if verification is pending
    if (user.verificationStatus === 'pending') {
      throw new Error('Verification request is already pending');
    }

    // Update verification status to pending
    user.verificationStatus = 'pending';
    await user.save();

    // TODO: Send notification to admin (email, webhook, etc.)
    // This could be implemented later based on your notification system

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      verificationStatus: user.verificationStatus,
      isVerified: user.isVerified
    };
  }
}

module.exports = new UserService();
