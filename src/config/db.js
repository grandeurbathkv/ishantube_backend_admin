import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('⚠️ WARNING: MONGO_URI is not defined. Database connection will not be established.');
    return; // Don't exit - let the app run without DB
  }

  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    });
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    console.error('⚠️ App will continue running without database connection.');
    // Don't exit - allow the app to run and retry connection later if needed
  }
};

export default connectDB;