/**
 * Admin Setup Script
 * Run this script to create or promote a user to admin
 * 
 * Usage: node scripts/createAdmin.js <email>
 * Example: node scripts/createAdmin.js admin@findhouse.com
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/userModel');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function createAdmin() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;

  if (!email) {
    console.error('❌ Error: Please provide an email address');
    console.log('Usage: node scripts/createAdmin.js <email>');
    console.log('Or set ADMIN_EMAIL in your .env file');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      console.error(`❌ Error: No user found with email: ${email}`);
      console.log('Please make sure the user has registered first.');
      process.exit(1);
    }

    // Check if already admin
    if (user.role === 'admin') {
      console.log(`ℹ️  User ${email} is already an admin`);
      process.exit(0);
    }

    // Update user role to admin
    user.role = 'admin';
    await user.save();

    console.log('✅ Successfully promoted user to admin:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user._id}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

createAdmin();
