import mongoose from 'mongoose';

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI_DIRECT || process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI or MONGODB_URI_DIRECT is not configured');
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    if (
      !process.env.MONGODB_URI_DIRECT &&
      process.env.MONGODB_URI?.startsWith('mongodb+srv://') &&
      /querySrv|ENOTFOUND|ECONNREFUSED/i.test(error.message)
    ) {
      error.message = `${error.message}. SRV DNS lookup failed. Set MONGODB_URI_DIRECT in backend/.env to a non-SRV Atlas seed-list URI.`;
    }

    throw error;
  }
};

export default connectDatabase;
