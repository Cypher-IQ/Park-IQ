const mongoose = require('mongoose');
const User = require('../models/User');

// Avoid buffering DB operations when Mongo is unreachable in development.
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 0);

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/parkiq';
  const localUri = process.env.MONGO_LOCAL_URI || 'mongodb://127.0.0.1:27017/parkiq';

  try {
    const conn = await mongoose.connect(primaryUri);
    console.log(`[MongoDB] User Service Connected: ${conn.connection.host}`);

    // Seed default credentials for demo purposes
    const adminExists = await User.findOne({ email: 'admin@demo.com' });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: 'admin@demo.com',
        password: 'admin1234',
        role: 'admin',
        isActive: true
      });
      console.log('[MongoDB] Seeded default admin@demo.com account');
    }

    const userExists = await User.findOne({ email: 'user@demo.com' });
    if (!userExists) {
      await User.create({
        name: 'Demo User',
        email: 'user@demo.com',
        password: 'demo1234',
        role: 'user',
        isActive: true
      });
      console.log('[MongoDB] Seeded default user@demo.com account');
    }

  } catch (error) {
    console.error(`[MongoDB] User Service Error: ${error.message}`);

    if (primaryUri !== localUri) {
      try {
        const fallbackConn = await mongoose.connect(localUri);
        console.log(`[MongoDB] User Service Fallback Connected: ${fallbackConn.connection.host}`);
        return;
      } catch (fallbackError) {
        console.error(`[MongoDB] User Service Fallback Error: ${fallbackError.message}`);
      }
    }

    if (process.env.NODE_ENV === 'production') process.exit(1);
    console.warn('[MongoDB] Continuing in development mode without DB connection. Some features will be disabled.');
  }
};

module.exports = connectDB;
