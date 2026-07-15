import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Read admin credentials from environment variables only — no hardcoded fallbacks
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;

    if (!adminEmail || !adminPassword) {
      console.error('❌ ADMIN_EMAIL or ADMIN_PASSWORD is not set in environment');
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    if (!jwtSecret) {
      console.error('❌ JWT_SECRET is not set in environment');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Try to find the user in DB
    let user = await User.findOne({ email: email.toLowerCase() });

    // If no user exists yet, create one if credentials match the configured admin
    if (!user) {
      if (
        email.toLowerCase() === adminEmail.toLowerCase() &&
        password === adminPassword
      ) {
        user = await User.create({
          email: adminEmail,
          password: adminPassword,
          name: 'Admin',
        });
      } else {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    } else {
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Generate a real signed JWT
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
