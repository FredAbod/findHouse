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
  // Format user response with all required fields
  const user = req.user;
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profilePicture: user.profilePicture || null,
    about: user.about || '',
    nickname: user.nickname || null,
    isVerified: user.isVerified,
    verificationStatus: user.verification?.status || 'unverified',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
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
