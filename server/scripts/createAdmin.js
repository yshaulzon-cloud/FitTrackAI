require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function createAdmin() {
  await mongoose.connect(process.env.MONGODB_URI);

  const email = 'admin@areto.app';
  const password = 'Admin123!';

  // Check if admin already exists
  const existing = await User.findOne({ email });
  if (existing) {
    existing.isAdmin = true;
    await existing.save();
    console.log('Admin user updated:', email);
  } else {
    await User.create({
      email,
      password,
      isAdmin: true,
      onboardingComplete: false,
    });
    console.log('Admin user created:', email);
  }

  console.log('Email:', email);
  console.log('Password:', password);

  await mongoose.disconnect();
}

createAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
