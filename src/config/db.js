const mongoose = require('mongoose');

const connectDB = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      
      if (attempt === retries) {
        console.error('All MongoDB connection attempts failed. Exiting...');
        process.exit(1);
      }
      
      const waitTime = delay * attempt; // Exponential backoff
      console.log(`Retrying in ${waitTime / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

module.exports = connectDB;
