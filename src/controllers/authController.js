const asyncHandler = require('express-async-handler');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const userData = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone
  };
  
  const user = await authService.register(userData, req);
  res.status(201).json(user);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.login(email, password, req);
  res.json(user);
});

const logout = asyncHandler(async (req, res) => {
  res.json({ message: 'User logged out' });
});

const getMe = asyncHandler(async (req, res) => {
  const User = require('../models/userModel');
  const billingService = require('../services/billingService');
  const fresh = await User.findById(req.user._id)
    .select('-password')
    .lean();

  if (!fresh) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    _id: fresh._id,
    name: fresh.name,
    email: fresh.email,
    phone: fresh.phone,
    role: fresh.role,
    profilePicture: fresh.profilePicture || null,
    about: fresh.about || '',
    nickname: fresh.nickname || null,
    isVerified: fresh.isVerified,
    verificationStatus: fresh.verification?.status || 'unverified',
    createdAt: fresh.createdAt,
    updatedAt: fresh.updatedAt,
    billing: billingService.sanitizeBillingPublic(fresh)
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    res.status(400);
    throw new Error('Please provide an email address');
  }

  const result = await authService.forgotPassword(email);
  res.json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  
  if (!token || !password) {
    res.status(400);
    throw new Error('Please provide token and new password');
  }

  const result = await authService.resetPassword(token, password);
  res.json(result);
});

module.exports = {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword
};
