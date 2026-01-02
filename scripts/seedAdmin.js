import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = process.env;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ADMIN_EMAIL or ADMIN_PASSWORD is not set.');
  process.exit(1);
}

const adminName = ADMIN_NAME || 'Admin';

const upsertAdmin = async () => {
  try {
    await mongoose.connect(MONGODB_URI);

    const removed = await User.deleteMany({
      role: 'admin',
      email: { $ne: ADMIN_EMAIL },
    });
    if (removed.deletedCount > 0) {
      console.log(`Removed ${removed.deletedCount} other admin account(s).`);
    }

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      existing.name = adminName;
      existing.password = ADMIN_PASSWORD;
      existing.role = 'admin';
      await existing.save();
      console.log(`Admin updated: ${ADMIN_EMAIL}`);
    } else {
      await User.create({
        name: adminName,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log(`Admin created: ${ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.error(`Failed to seed admin: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

upsertAdmin();
