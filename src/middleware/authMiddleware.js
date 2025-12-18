const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        res.status(401);
        throw new Error('User not found');
      }
      
      if (user.isActive === false) {
        res.status(403);
        throw new Error('Account has been deactivated. Please contact support.');
      }
      
      req.user = user;
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      // Only set user if found and active
      if (user && user.isActive !== false) {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (error) {
      // If token verification fails, continue without user (public access)
      // Don't throw error, just log it for debugging
      console.log('Optional auth token verification failed:', error.message);
      req.user = null;
    }
  }

  // Always call next() to allow the request to proceed
  next();
});

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as admin');
  }
};

module.exports = { protect, optionalAuth, admin };
