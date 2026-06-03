import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const STORAGE_LIMITS = {
  user: 50 * 1024 * 1024,    // 50 MB
  admin: 500 * 1024 * 1024,  // 500 MB
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    storageUsed: {
      type: Number,
      default: 0, // in bytes
    },
    otp: {
      code: String,
      expiresAt: Date,
      type: {
        type: String,
        enum: ['verify_email', 'reset_password'],
      },
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate avatar from name
userSchema.methods.getAvatar = function () {
  if (this.avatar) return this.avatar;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name)}&background=6366f1&color=fff`;
};

// Get storage limit based on role
userSchema.methods.getStorageLimit = function () {
  return STORAGE_LIMITS[this.role] || STORAGE_LIMITS.user;
};

// Check if user has enough storage
userSchema.methods.hasStorageSpace = function (bytesNeeded) {
  return (this.storageUsed + bytesNeeded) <= this.getStorageLimit();
};

const User = mongoose.model('User', userSchema);
export { STORAGE_LIMITS };
export default User;
