const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const createInitialAdmins = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const localities = [
      {
        name: 'Downtown Administrator',
        email: 'admin.downtown@city.gov',
        password: 'admin123',
        phone: '9876543210',
        locality: 'Downtown',
        ward: 'Ward 1'
      },
      {
        name: 'Uptown Administrator', 
        email: 'admin.uptown@city.gov',
        password: 'admin123',
        phone: '9876543211',
        locality: 'Uptown',
        ward: 'Ward 2'
      },
      {
        name: 'Midtown Administrator',
        email: 'admin.midtown@city.gov',
        password: 'admin123',
        phone: '9876543212', 
        locality: 'Midtown',
        ward: 'Ward 3'
      }
    ];

    for (const adminData of localities) {
      const existingAdmin = await User.findOne({ 
        role: 'admin', 
        'address.locality': adminData.locality 
      });

      if (!existingAdmin) {
        const admin = await User.create({
          name: adminData.name,
          email: adminData.email,
          password: adminData.password,
          role: 'admin',
          phone: adminData.phone,
          address: {
            locality: adminData.locality,
            ward: adminData.ward,
            city: 'Your City'
          },
          isApproved: true
        });
        console.log(`✅ Created admin for ${adminData.locality}: ${admin.email}`);
      } else {
        console.log(`ℹ️  Admin already exists for ${adminData.locality}: ${existingAdmin.email}`);
      }
    }

    console.log('🎉 Initial admin setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admins:', error);
    process.exit(1);
  }
};

createInitialAdmins();