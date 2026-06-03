import express from 'express';
import User from '../models/User.js';
import Note from '../models/Note.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// ─── ADMIN DASHBOARD STATS ───────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, activeUsers, totalNotes, totalAttachments, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Note.countDocuments(),
      Note.aggregate([
        { $project: { attachmentCount: { $size: { $ifNull: ['$attachments', []] } } } },
        { $group: { _id: null, total: { $sum: '$attachmentCount' } } },
      ]),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name email avatar role isActive createdAt'),
    ]);

    // Notes per day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const notesPerDay = await Note.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Users per day (last 7 days)
    const usersPerDay = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalNotes,
        totalAttachments: totalAttachments[0]?.total || 0,
        notesPerDay,
        usersPerDay,
        recentUsers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── LIST ALL USERS ───────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
      };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('name email avatar role isActive isVerified createdAt googleId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET USER DETAILS (no files) ──────────────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email avatar role isActive isVerified createdAt updatedAt googleId');

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Get note stats for the user (count only, no content/files)
    const noteStats = await Note.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: null,
          totalNotes: { $sum: 1 },
          pinnedNotes: { $sum: { $cond: ['$isPinned', 1, 0] } },
          totalAttachments: { $sum: { $size: { $ifNull: ['$attachments', []] } } },
          totalReminders: { $sum: { $size: { $ifNull: ['$reminders', []] } } },
          sharedNotes: { $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ['$sharedWith', []] } }, 0] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      user,
      noteStats: noteStats[0] || { totalNotes: 0, pinnedNotes: 0, totalAttachments: 0, totalReminders: 0, sharedNotes: 0 },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── TOGGLE USER ACTIVE STATUS ────────────────────────────────────────────────
router.patch('/users/:id/toggle-active', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own account.' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: user.isActive ? 'User activated.' : 'User deactivated.',
      user: { _id: user._id, isActive: user.isActive },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CHANGE USER ROLE ─────────────────────────────────────────────────────────
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
    }

    user.role = role;
    await user.save();

    res.json({ success: true, message: `User role updated to ${role}.`, user: { _id: user._id, role: user.role } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE USER ──────────────────────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account from admin panel.' });
    }

    // Delete user's notes (attachments are cleaned via cascade logic)
    await Note.deleteMany({ user: user._id });
    await Note.updateMany(
      { 'sharedWith.user': user._id },
      { $pull: { sharedWith: { user: user._id } } }
    );
    await User.findByIdAndDelete(user._id);

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
