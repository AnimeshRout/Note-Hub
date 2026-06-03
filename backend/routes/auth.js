import express from 'express';
import passport from 'passport';
import User, { STORAGE_LIMITS } from '../models/User.js';
import Note from '../models/Note.js';
import { generateToken } from '../utils/jwt.js';
import {
  sendVerificationOTP,
  sendPasswordResetOTP,
} from '../utils/email.js';
import { protect } from '../middleware/auth.js';
import { deleteFromCloudinary } from '../config/cloudinary.js';

const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.getAvatar(),
  role: user.role,
  storageUsed: user.storageUsed || 0,
  storageLimit: user.getStorageLimit(),
});

const router = express.Router();

// ─── SIGNUP ──────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password, isVerified: false });

    // Send verification OTP
    const otp = await sendVerificationOTP(email, name);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await User.findByIdAndUpdate(user._id, {
      otp: { code: otp, expiresAt, type: 'verify_email' },
    });

    res.status(201).json({
      success: true,
      message: 'Account created! Please verify your email with the OTP sent.',
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── VERIFY EMAIL OTP ────────────────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (
      !user.otp?.code ||
      user.otp.code !== otp ||
      user.otp.type !== 'verify_email' ||
      new Date() > user.otp.expiresAt
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Email verified successfully!',
      token,
      user: userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── RESEND OTP ───────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId, type } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    let otp;
    if (type === 'verify_email') {
      otp = await sendVerificationOTP(user.email, user.name);
    } else {
      otp = await sendPasswordResetOTP(user.email, user.name);
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await User.findByIdAndUpdate(user._id, { otp: { code: otp, expiresAt, type } });

    res.json({ success: true, message: 'OTP resent to your email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isVerified) {
      // Resend verification OTP
      const otp = await sendVerificationOTP(user.email, user.name);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await User.findByIdAndUpdate(user._id, {
        otp: { code: otp, expiresAt, type: 'verify_email' },
      });
      return res.status(403).json({
        success: false,
        message: 'Email not verified. OTP sent to your email.',
        userId: user._id,
        requiresVerification: true,
      });
    }

    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    const otp = await sendPasswordResetOTP(user.email, user.name);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await User.findByIdAndUpdate(user._id, {
      otp: { code: otp, expiresAt, type: 'reset_password' },
    });

    res.json({
      success: true,
      message: 'Password reset OTP sent to your email.',
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── VERIFY RESET OTP ─────────────────────────────────────────────────────────
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (
      !user.otp?.code ||
      user.otp.code !== otp ||
      user.otp.type !== 'reset_password' ||
      new Date() > user.otp.expiresAt
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    res.json({ success: true, message: 'OTP verified. You may now reset your password.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { userId, otp, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (
      !user.otp?.code ||
      user.otp.code !== otp ||
      user.otp.type !== 'reset_password' ||
      new Date() > user.otp.expiresAt
    ) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    user.password = newPassword;
    user.otp = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.json({
      success: true,
      message: 'Password reset successfully!',
      token,
      user: userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GOOGLE OAUTH ─────────────────────────────────────────────────────────────
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed`, session: false }),
  (req, res) => {
    const token = generateToken(req.user._id);
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}&name=${encodeURIComponent(req.user.name)}&email=${encodeURIComponent(req.user.email)}&avatar=${encodeURIComponent(req.user.avatar || '')}&role=${req.user.role}`);
  }
);

// ─── GET ME ───────────────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    user: userResponse(user),
  });
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (name) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();
    res.json({
      success: true,
      user: userResponse(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');

    // If user has a password (not Google-only), verify current password
    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required.' });
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
      }
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
router.delete('/account', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete all notes and their Cloudinary attachments
    const notes = await Note.find({ user: userId });
    for (const note of notes) {
      for (const att of note.attachments || []) {
        try {
          await deleteFromCloudinary(att.publicId, att.type === 'image' ? 'image' : att.type === 'voice' ? 'video' : 'raw');
        } catch (e) { /* ignore cleanup errors */ }
      }
    }
    await Note.deleteMany({ user: userId });

    // Remove shared note references
    await Note.updateMany(
      { 'sharedWith.user': userId },
      { $pull: { sharedWith: { user: userId } } }
    );

    // Delete user
    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
