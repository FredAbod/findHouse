const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

class AuthService {
  generateToken(id) {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  }

  async register(userData) {
    if (await User.findOne({ email: userData.email })) {
      throw new Error('User already exists');
    }

    const user = await User.create(userData);
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      token: this.generateToken(user._id)
    };
  }

  async login(email, password) {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        token: this.generateToken(user._id)
      };
    }
    throw new Error('Invalid email or password');
  }
}

module.exports = new AuthService();
