import cron from 'node-cron';
import Note from '../models/Note.js';
import User from '../models/User.js';
import { sendReminderEmail } from '../utils/email.js';

/**
 * Start the reminder cron job
 * Checks every minute for due reminders and sends email notifications
 */
export const startReminderCron = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // Find notes with unsent reminders that are due
      const notes = await Note.find({
        'reminders': {
          $elemMatch: {
            date: { $lte: now },
            sent: false,
          },
        },
      }).populate('user', 'name email');

      for (const note of notes) {
        for (const reminder of note.reminders) {
          if (!reminder.sent && new Date(reminder.date) <= now) {
            try {
              await sendReminderEmail(
                note.user.email,
                note.user.name,
                note.title,
                reminder.message
              );
              reminder.sent = true;
            } catch (emailErr) {
              console.error(`Failed to send reminder email for note ${note._id}:`, emailErr.message);
            }
          }
        }
        await note.save();
      }
    } catch (err) {
      console.error('Reminder cron error:', err.message);
    }
  });

  console.log('⏰ Reminder cron job started (checks every minute)');
};
