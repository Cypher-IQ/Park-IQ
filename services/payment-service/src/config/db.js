const mongoose = require('mongoose');

// Avoid buffering DB operations when Mongo is unreachable in development.
mongoose.set('bufferCommands', false);
mongoose.set('bufferTimeoutMS', 0);

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/parkiq';
  const localUri = process.env.MONGO_LOCAL_URI || 'mongodb://127.0.0.1:27017/parkiq';

  try {
    const conn = await mongoose.connect(primaryUri);
    console.log(`[MongoDB] Payment Service Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Payment Service Error: ${error.message}`);

    if (primaryUri !== localUri) {
      try {
        const fallbackConn = await mongoose.connect(localUri);
        console.log(`[MongoDB] Payment Service Fallback Connected: ${fallbackConn.connection.host}`);
        return;
      } catch (fallbackError) {
        console.error(`[MongoDB] Payment Service Fallback Error: ${fallbackError.message}`);
      }
    }

    if (process.env.NODE_ENV === 'production') process.exit(1);
    console.warn('[MongoDB] Continuing in development mode without DB connection. Some features will be disabled.');
  }
};

module.exports = connectDB;
