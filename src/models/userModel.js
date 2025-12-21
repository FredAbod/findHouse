const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Reserved nicknames that cannot be used
const RESERVED_NICKNAMES = [
  'admin', 'api', 'profile', 'login', 'register', 'logout', 'settings',
  'dashboard', 'properties', 'users', 'support', 'help', 'about', 'contact',
  'findhouse', 'system', 'moderator', 'mod', 'root', 'superuser', 'null',
  'undefined', 'anonymous', 'guest', 'public', 'private', 'verification'
];

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  phone: String,
  role: {
    type: String,
    enum: ['user', 'agent', 'admin'],
    default: 'user'
  },
  // Profile enhancements
  profilePicture: {
    type: String,
    default: null
  },
  about: {
    type: String,
    maxlength: [500, 'About section cannot exceed 500 characters'],
    default: ''
  },
  nickname: {
    type: String,
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
    lowercase: true,
    trim: true,
    minlength: [3, 'Nickname must be at least 3 characters'],
    maxlength: [30, 'Nickname cannot exceed 30 characters'],
    match: [/^[a-z0-9_]+$/, 'Nickname can only contain lowercase letters, numbers, and underscores'],
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null/empty
        return !RESERVED_NICKNAMES.includes(v.toLowerCase());
      },
      message: 'This nickname is reserved and cannot be used'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Enhanced verification system
  verification: {
    status: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified'
    },
    idType: {
      type: String,
      enum: ['NIN', 'BVN', 'DRIVERS_LICENSE']
    },
    idNumber: String, // Should be encrypted before storing
    documentUrl: String, // Secure file storage URL
    residentialAddress: {
      address: String,
      city: String,
      state: String
    },
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: String
  },
  verifiedAt: Date,
  // Account status
  isActive: {
    type: Boolean,
    default: true
  },
  deactivatedAt: Date,
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Email verification
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  emailVerificationSentAt: Date,
  // Password reset
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  // Login tracking
  lastLoginAt: Date,
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  favoriteProperties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  }]
}, {
  timestamps: true,
  versionKey: false
});

// Index for nickname lookups
userSchema.index({ nickname: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Static method to check if nickname is available
userSchema.statics.isNicknameAvailable = async function(nickname, excludeUserId = null) {
  if (!nickname) return false;
  
  const normalizedNickname = nickname.toLowerCase().trim();
  
  // Check reserved nicknames
  if (RESERVED_NICKNAMES.includes(normalizedNickname)) {
    return false;
  }
  
  // Check if nickname exists in database
  const query = { nickname: normalizedNickname };
  if (excludeUserId) {
    query._id = { $ne: excludeUserId };
  }
  
  const existingUser = await this.findOne(query);
  return !existingUser;
};

// Export reserved nicknames for use in other files
userSchema.statics.RESERVED_NICKNAMES = RESERVED_NICKNAMES;

const User = mongoose.model('User', userSchema);
module.exports = User;
