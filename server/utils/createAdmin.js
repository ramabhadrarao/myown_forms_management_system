import User from '../models/User.js';

export async function createDefaultAdmin() {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create default admin
    const admin = new User({
      email: process.env.ADMIN_EMAIL || 'admin@formsapp.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      name: 'System Administrator',
      role: 'admin',
      isApproved: true,
      isActive: true
    });

    await admin.save();
    console.log('Default admin user created:', admin.email);
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}