const User = require('../models/userModel');
const Property = require('../models/propertyModel');
const cloudinary = require('cloudinary').v2;
const crypto = require('crypto');
const emailService = require('./emailService');

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
      profilePicture: user.profilePicture,
      about: user.about || '',
      nickname: user.nickname,
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

    // Handle allowed fields only
    const allowedFields = ['name', 'phone', 'about', 'nickname'];
    const filteredData = {};
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    // Validate nickname if being updated
    if (filteredData.nickname) {
      const normalizedNickname = filteredData.nickname.toLowerCase().trim();
      
      // Check nickname format
      if (!/^[a-z0-9_]+$/.test(normalizedNickname)) {
        throw new Error('Nickname can only contain lowercase letters, numbers, and underscores');
      }
      
      if (normalizedNickname.length < 3 || normalizedNickname.length > 30) {
        throw new Error('Nickname must be between 3 and 30 characters');
      }
      
      // Check availability
      const isAvailable = await User.isNicknameAvailable(normalizedNickname, userId);
      if (!isAvailable) {
        throw new Error('This nickname is already taken or reserved');
      }
      
      filteredData.nickname = normalizedNickname;
    }

    // Validate about length
    if (filteredData.about && filteredData.about.length > 500) {
      throw new Error('About section cannot exceed 500 characters');
    }

    Object.assign(user, filteredData);
    const updatedUser = await user.save();
    
    return {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profilePicture: updatedUser.profilePicture,
      about: updatedUser.about || '',
      nickname: updatedUser.nickname
    };
  }

  // Upload profile picture
  async uploadProfilePicture(userId, file, currentUserId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    if (user._id.toString() !== currentUserId.toString()) {
      throw new Error('Not authorized');
    }

    if (!file) {
      throw new Error('No file provided');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed');
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('File size must be less than 2MB');
    }

    // Delete old profile picture from Cloudinary if exists
    if (user.profilePicture) {
      try {
        const publicId = user.profilePicture.split('/').slice(-1)[0].split('.')[0];
        await cloudinary.uploader.destroy(`profile-pictures/${publicId}`);
      } catch (error) {
        console.error('Error deleting old profile picture:', error.message);
      }
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'profile-pictures',
      public_id: `user-${userId}-${Date.now()}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });

    // Update user profile picture
    user.profilePicture = result.secure_url;
    await user.save();

    return {
      success: true,
      profilePicture: result.secure_url
    };
  }

  // Check nickname availability
  async checkNicknameAvailability(nickname, excludeUserId = null) {
    if (!nickname) {
      throw new Error('Nickname is required');
    }

    const normalizedNickname = nickname.toLowerCase().trim();

    // Validate format
    if (!/^[a-z0-9_]+$/.test(normalizedNickname)) {
      return {
        available: false,
        nickname: normalizedNickname,
        message: 'Nickname can only contain lowercase letters, numbers, and underscores'
      };
    }

    if (normalizedNickname.length < 3) {
      return {
        available: false,
        nickname: normalizedNickname,
        message: 'Nickname must be at least 3 characters'
      };
    }

    if (normalizedNickname.length > 30) {
      return {
        available: false,
        nickname: normalizedNickname,
        message: 'Nickname cannot exceed 30 characters'
      };
    }

    const isAvailable = await User.isNicknameAvailable(normalizedNickname, excludeUserId);

    if (isAvailable) {
      return {
        available: true,
        nickname: normalizedNickname
      };
    }

    // Check if it's reserved or taken
    if (User.RESERVED_NICKNAMES.includes(normalizedNickname)) {
      return {
        available: false,
        nickname: normalizedNickname,
        message: 'This nickname is reserved'
      };
    }

    return {
      available: false,
      nickname: normalizedNickname,
      message: 'This nickname is already taken'
    };
  }

  // Get public profile by nickname
  async getPublicProfileByNickname(nickname) {
    if (!nickname) {
      throw new Error('Nickname is required');
    }

    const normalizedNickname = nickname.toLowerCase().trim();

    const user = await User.findOne({ nickname: normalizedNickname })
      .select('name nickname profilePicture about isVerified createdAt');

    if (!user) {
      throw new Error('User not found');
    }

    // Get user's available properties (not hidden)
    const properties = await Property.find({
      owner: user._id,
      isHidden: { $ne: true },
      status: 'available'
    })
      .select('title price type category location images bedrooms bathrooms status createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Calculate stats
    const totalProperties = await Property.countDocuments({
      owner: user._id,
      isHidden: { $ne: true }
    });

    // Sum up views from all properties (if you track views)
    const allProperties = await Property.find({ owner: user._id }).select('views').lean();
    const totalViews = allProperties.reduce((sum, prop) => sum + (prop.views || 0), 0);

    return {
      user: {
        name: user.name,
        nickname: user.nickname,
        profilePicture: user.profilePicture,
        about: user.about || '',
        isVerified: user.isVerified,
        memberSince: user.createdAt
      },
      properties,
      stats: {
        totalProperties,
        totalViews
      }
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

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      verificationStatus: user.verificationStatus,
      isVerified: user.isVerified
    };
  }

  // Send email verification
  async sendEmailVerification(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    // Check if already verified
    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    // Rate limiting: Check if a verification email was sent recently (within 5 minutes)
    if (user.emailVerificationSentAt) {
      const timeSinceLastSent = Date.now() - new Date(user.emailVerificationSentAt).getTime();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeSinceLastSent < fiveMinutes) {
        const remainingMinutes = Math.ceil((fiveMinutes - timeSinceLastSent) / 60000);
        throw new Error(`Please wait ${remainingMinutes} minute(s) before requesting another verification email`);
      }
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before storing
    const hashedToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Save token with 24 hour expiry
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    user.emailVerificationSentAt = new Date();
    await user.save();

    // Create verification URL
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    // Send verification email
    try {
      await emailService.sendEmailVerification({
        to: user.email,
        name: user.name,
        verifyUrl
      });
      
      return {
        success: true,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      // Clear token if email fails
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      user.emailVerificationSentAt = undefined;
      await user.save();
      
      console.error('Failed to send verification email:', error.message);
      throw new Error('Failed to send verification email. Please try again later.');
    }
  }

  // Verify email with token
  async verifyEmail(token) {
    if (!token) {
      throw new Error('Verification token is required');
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.emailVerificationSentAt = undefined;
    await user.save();

    return {
      success: true,
      message: 'Email verified successfully'
    };
  }
}

module.exports = new UserService();
