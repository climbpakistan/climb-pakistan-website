import mongoose from 'mongoose';
import dns from 'dns';

// Force Google DNS for SRV record resolution — the system DNS on some
// Windows / corporate networks doesn't support SRV lookups needed by
// MongoDB Atlas (mongodb+srv:// protocol).
dns.setServers(['8.8.8.8']);

export async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGO_URI is not set in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB runtime error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });
}
