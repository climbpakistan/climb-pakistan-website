import { Router } from 'express';
import ContactSetting from '../models/ContactSetting.js';
import requireAdmin from '../middleware/auth.js';

const router = Router();

// ── Admin-protected: GET / PUT contact settings (notification email) ──
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    let setting = await ContactSetting.findOne();
    if (!setting) {
      setting = await ContactSetting.create({ notificationEmail: '' });
    }
    res.json({ notificationEmail: setting.notificationEmail });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const { notificationEmail } = req.body;

    if (!notificationEmail || !notificationEmail.trim()) {
      return res.status(400).json({ error: 'Notification email is required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(notificationEmail.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    let setting = await ContactSetting.findOne();
    if (!setting) {
      setting = await ContactSetting.create({ notificationEmail: notificationEmail.trim() });
    } else {
      setting.notificationEmail = notificationEmail.trim();
      await setting.save();
    }

    res.json({ notificationEmail: setting.notificationEmail, message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST contact form submission (via Web3Forms) ──
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!email || !email.trim()) return res.status(400).json({ error: 'Email is required.' });
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const accessKey = process.env.WEB3FORMS_ACCESS_KEY;
    if (!accessKey) {
      console.error('Web3Forms error: WEB3FORMS_ACCESS_KEY not set in backend/.env');
      return res.status(500).json({ error: 'Contact form is not configured yet.' });
    }

    // Send to Web3Forms API
    const web3res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: accessKey,
        subject: `Contact Form: ${subject || 'New Message'} from ${name.trim()}`,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      }),
    });

    const result = await web3res.json();

    if (!web3res.ok || !result.success) {
      console.error('Web3Forms error:', result);
      return res.status(500).json({ error: 'Failed to send message. Please try again later.' });
    }

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

export default router;
