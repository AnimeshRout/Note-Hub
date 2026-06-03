import express from 'express';
import Note from '../models/Note.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// ─── GET ALL NOTES (own + shared) ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, tag } = req.query;

    // Own notes
    let ownQuery = { user: req.user._id };
    // Shared notes
    let sharedQuery = { 'sharedWith.user': req.user._id };

    if (search) {
      const searchFilter = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
        ],
      };
      ownQuery = { $and: [ownQuery, searchFilter] };
      sharedQuery = { $and: [sharedQuery, searchFilter] };
    }

    if (tag) {
      ownQuery.tags = tag;
      sharedQuery.tags = tag;
    }

    const [ownNotes, sharedNotes] = await Promise.all([
      Note.find(ownQuery).sort({ isPinned: -1, updatedAt: -1 }),
      Note.find(sharedQuery)
        .populate('user', 'name email avatar')
        .sort({ updatedAt: -1 }),
    ]);

    // Mark shared notes with metadata
    const formattedShared = sharedNotes.map(n => {
      const obj = n.toObject();
      obj.isShared = true;
      const shareInfo = n.sharedWith.find(s => s.user.toString() === req.user._id.toString());
      obj.myPermission = shareInfo?.permission || 'view';
      return obj;
    });

    res.json({ success: true, notes: ownNotes, sharedNotes: formattedShared });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── CREATE NOTE ──────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { title, content, color, tags, isPinned, reminders } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    const note = await Note.create({
      user: req.user._id,
      title: title.trim(),
      content: content || '',
      color: color || 'default',
      tags: tags || [],
      isPinned: isPinned || false,
      reminders: reminders || [],
    });

    res.status(201).json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── UPDATE NOTE ──────────────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    // Allow editing own notes OR shared notes with edit permission
    let note = await Note.findOne({ _id: req.params.id, user: req.user._id });

    if (!note) {
      // Check if it's a shared note with edit permission
      note = await Note.findOne({
        _id: req.params.id,
        'sharedWith.user': req.user._id,
        'sharedWith.permission': 'edit',
      });
    }

    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    const { title, content, color, tags, isPinned, reminders } = req.body;
    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (color !== undefined) note.color = color;
    if (tags !== undefined) note.tags = tags;
    if (isPinned !== undefined) note.isPinned = isPinned;
    if (reminders !== undefined) note.reminders = reminders;

    await note.save();
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE NOTE ──────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    // Clean up Cloudinary attachments and reclaim storage
    let freedBytes = 0;
    for (const att of note.attachments || []) {
      try {
        const resourceType = att.type === 'image' ? 'image' : att.type === 'voice' ? 'video' : 'raw';
        await deleteFromCloudinary(att.publicId, resourceType);
        freedBytes += att.bytes || 0;
      } catch (e) { /* ignore cleanup errors */ }
    }

    // Reclaim storage
    if (freedBytes > 0) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -freedBytes } });
    }

    await Note.findByIdAndDelete(note._id);
    res.json({ success: true, message: 'Note deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── TOGGLE PIN ───────────────────────────────────────────────────────────────
router.patch('/:id/pin', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });
    note.isPinned = !note.isPinned;
    await note.save();
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── UPLOAD ATTACHMENT ────────────────────────────────────────────────────────
router.post('/:id/attachments', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    const { file, type, name } = req.body; // file is base64 data URL

    if (!file) {
      return res.status(400).json({ success: false, message: 'File data is required.' });
    }

    // Estimate file size from base64 (rough estimate before upload)
    const base64Length = file.includes(',') ? file.split(',')[1].length : file.length;
    const estimatedBytes = Math.ceil(base64Length * 0.75);

    // Check storage quota
    const currentUser = await User.findById(req.user._id);
    if (!currentUser.hasStorageSpace(estimatedBytes)) {
      const limitMB = Math.round(currentUser.getStorageLimit() / (1024 * 1024));
      const usedMB = (currentUser.storageUsed / (1024 * 1024)).toFixed(1);
      return res.status(413).json({
        success: false,
        message: `Storage limit exceeded. You've used ${usedMB}MB of ${limitMB}MB. Delete some files to free up space.`,
        storageUsed: currentUser.storageUsed,
        storageLimit: currentUser.getStorageLimit(),
      });
    }

    // Determine folder and resource type
    let folder = 'notes-app/attachments';
    let resourceType = 'auto';
    if (type === 'voice') {
      folder = 'notes-app/voice-notes';
      resourceType = 'video';
    } else if (type === 'pdf') {
      folder = 'notes-app/pdfs';
      resourceType = 'raw';
    } else if (type === 'image') {
      folder = 'notes-app/images';
      resourceType = 'image';
    }

    const uploadResult = await uploadToCloudinary(file, {
      folder,
      resource_type: resourceType,
    });

    const actualBytes = uploadResult.bytes || estimatedBytes;

    const attachment = {
      url: uploadResult.url,
      publicId: uploadResult.publicId,
      type: type || 'image',
      name: name || '',
      format: uploadResult.format || '',
      bytes: actualBytes,
      duration: uploadResult.duration,
    };

    note.attachments.push(attachment);
    await note.save();

    // Update user's storage used
    await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: actualBytes } });

    // Get updated storage info
    const updatedUser = await User.findById(req.user._id);

    res.status(201).json({
      success: true,
      attachment: note.attachments[note.attachments.length - 1],
      note,
      storage: {
        used: updatedUser.storageUsed,
        limit: updatedUser.getStorageLimit(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE ATTACHMENT ────────────────────────────────────────────────────────
router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    const attachment = note.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ success: false, message: 'Attachment not found.' });

    const freedBytes = attachment.bytes || 0;

    // Delete from Cloudinary
    try {
      const resourceType = attachment.type === 'image' ? 'image' : attachment.type === 'voice' ? 'video' : 'raw';
      await deleteFromCloudinary(attachment.publicId, resourceType);
    } catch (e) { /* ignore */ }

    note.attachments.pull(req.params.attachmentId);
    await note.save();

    // Reclaim storage
    if (freedBytes > 0) {
      await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -freedBytes } });
    }

    const updatedUser = await User.findById(req.user._id);

    res.json({
      success: true,
      message: 'Attachment deleted.',
      note,
      storage: {
        used: updatedUser.storageUsed,
        limit: updatedUser.getStorageLimit(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET STORAGE INFO ─────────────────────────────────────────────────────────
router.get('/storage', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      storage: {
        used: user.storageUsed,
        limit: user.getStorageLimit(),
        percentage: Math.round((user.storageUsed / user.getStorageLimit()) * 100),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── SHARE NOTE ───────────────────────────────────────────────────────────────
router.post('/:id/share', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    const { email, permission } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const targetUser = await User.findOne({ email });
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found with that email.' });

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot share a note with yourself.' });
    }

    // Check if already shared
    const existing = note.sharedWith.find(s => s.user.toString() === targetUser._id.toString());
    if (existing) {
      existing.permission = permission || 'view';
    } else {
      note.sharedWith.push({ user: targetUser._id, permission: permission || 'view' });
    }

    await note.save();
    const populated = await Note.findById(note._id).populate('sharedWith.user', 'name email avatar');
    res.json({ success: true, note: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── REMOVE SHARE ─────────────────────────────────────────────────────────────
router.delete('/:id/share/:userId', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    note.sharedWith = note.sharedWith.filter(s => s.user.toString() !== req.params.userId);
    await note.save();

    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── ADD REMINDER ─────────────────────────────────────────────────────────────
router.post('/:id/reminders', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    const { date, message } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'Reminder date is required.' });

    note.reminders.push({ date: new Date(date), message: message || '' });
    await note.save();

    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── DELETE REMINDER ──────────────────────────────────────────────────────────
router.delete('/:id/reminders/:reminderId', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id });
    if (!note) return res.status(404).json({ success: false, message: 'Note not found.' });

    note.reminders.pull(req.params.reminderId);
    await note.save();

    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
