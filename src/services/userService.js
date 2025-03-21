const User = require('../models/userModel');
const Property = require('../models/propertyModel');

class UserService {
  async getUserProfile(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) throw new Error('User not found');
    return user;
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
}

module.exports = new UserService();
