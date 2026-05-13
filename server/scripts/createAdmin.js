require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Admin bootstrap script. Reads credentials from env vars — never from
// hardcoded defaults — so the repo doesn't carry a publicly-known
// admin password.
//
// Usage:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<long random>' \
//     node server/scripts/createAdmin.js
//
// Password must be at least 16 characters; the goal is to never have a
// guessable/leaked credential active in production.
async function createAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.error('Refusing to run: ADMIN_EMAIL and ADMIN_PASSWORD must both be set in the environment.');
    console.error('Example: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD="$(openssl rand -base64 24)" node server/scripts/createAdmin.js');
    process.exit(1);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Refusing to run: ADMIN_EMAIL is not a valid email address.');
    process.exit(1);
  }
  if (password.length < 16) {
    console.error('Refusing to run: ADMIN_PASSWORD must be at least 16 characters.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await User.findOne({ email });
  if (existing) {
    existing.isAdmin = true;
    existing.password = password; // bcrypt hash via pre-save hook
    await existing.save();
    console.log('Admin user updated (promoted + password rotated):', email);
  } else {
    await User.create({
      email,
      password,
      isAdmin: true,
      onboardingComplete: false,
    });
    console.log('Admin user created:', email);
  }

  // Intentionally do NOT log the password back. The operator already has it.
  console.log('Done. Disconnect.');
  await mongoose.disconnect();
}

createAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
