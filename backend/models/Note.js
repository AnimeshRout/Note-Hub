import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  type: { type: String, enum: ['image', 'pdf', 'voice', 'video'], required: true },
  name: { type: String, default: '' },
  format: { type: String, default: '' },
  bytes: { type: Number, default: 0 },
  duration: { type: Number }, // for voice notes (seconds)
}, { _id: true });

const reminderSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  message: { type: String, default: '' },
  sent: { type: Boolean, default: false },
}, { _id: true });

const noteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      default: '',
      maxlength: [50000, 'Content too long'],
    },
    color: {
      type: String,
      default: 'default',
      enum: ['default', 'rose', 'amber', 'emerald', 'sky', 'violet', 'pink'],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 30,
      },
    ],
    attachments: [attachmentSchema],
    reminders: [reminderSchema],
    sharedWith: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        permission: { type: String, enum: ['view', 'edit'], default: 'view' },
      },
    ],
  },
  { timestamps: true }
);

noteSchema.index({ user: 1, createdAt: -1 });
noteSchema.index({ user: 1, isPinned: -1 });
noteSchema.index({ 'sharedWith.user': 1 });
noteSchema.index({ 'reminders.date': 1, 'reminders.sent': 1 });

const Note = mongoose.model('Note', noteSchema);
export default Note;
