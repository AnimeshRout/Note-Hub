import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { configurePassport } from './config/passport.js';
import { configureCloudinary } from './config/cloudinary.js';
import authRoutes from './routes/auth.js';
import notesRoutes from './routes/notes.js';
import adminRoutes from './routes/admin.js';
import { startReminderCron } from './utils/reminderCron.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect DB
connectDB();

// Configure Passport
configurePassport();

// Configure Cloudinary
configureCloudinary();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(passport.initialize());

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'NotesApp API is running 🚀' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start reminder cron job
startReminderCron();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
