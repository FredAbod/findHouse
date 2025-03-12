const asyncHandler = require('express-async-handler');
const authService = require('../services/authService');

const register = asyncHandler(async (req, res) => {
  const userData = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone
  };
  
  const user = await authService.register(userData);
  res.status(201).json(user);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.login(email, password);
  res.json(user);
});

const logout = asyncHandler(async (req, res) => {
  res.json({ message: 'User logged out' });
});

const getMe = asyncHandler(async (req, res) => {
  res.json(req.user);
});

module.exports = {
  register,
  login,
  logout,
  getMe
};
