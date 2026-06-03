import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const emailTemplate = (title, body, otp) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0e17; color: #fffffe; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 20px; }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 24px;
      overflow: hidden;
      backdrop-filter: blur(20px);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo { font-size: 28px; font-weight: 800; letter-spacing: -1px; color: #fff; }
    .logo span { opacity: 0.8; }
    .body { padding: 40px 36px; }
    .title { font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #fffffe; }
    .desc { font-size: 15px; color: rgba(255,255,255,0.65); line-height: 1.7; margin-bottom: 32px; }
    .otp-box {
      background: linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
      border: 1.5px solid rgba(99,102,241,0.4);
      border-radius: 16px;
      padding: 28px;
      text-align: center;
      margin-bottom: 28px;
    }
    .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: rgba(255,255,255,0.5); margin-bottom: 12px; }
    .otp-code { font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #a78bfa; font-family: monospace; }
    .expires { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 10px; }
    .warning { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); border-radius: 10px; padding: 14px 18px; font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; }
    .footer { padding: 24px 36px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; font-size: 12px; color: rgba(255,255,255,0.3); }
    .footer a { color: #a78bfa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">✦ Notes<span>App</span></div>
      </div>
      <div class="body">
        <div class="title">${title}</div>
        <div class="desc">${body}</div>
        <div class="otp-box">
          <div class="otp-label">Your verification code</div>
          <div class="otp-code">${otp}</div>
          <div class="expires">⏱ Valid for 10 minutes only</div>
        </div>
        <div class="warning">
          🔒 Never share this code with anyone. Our team will never ask for this code. If you didn't request this, please ignore this email or contact support.
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} NotesApp &mdash; <a href="#">Privacy Policy</a>
      </div>
    </div>
  </div>
</body>
</html>
`;

const reminderTemplate = (noteTitle, reminderMessage) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Note Reminder</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0e17; color: #fffffe; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 20px; }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 24px;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo { font-size: 28px; font-weight: 800; color: #fff; }
    .body { padding: 40px 36px; }
    .title { font-size: 22px; font-weight: 700; margin-bottom: 12px; color: #fffffe; }
    .desc { font-size: 15px; color: rgba(255,255,255,0.65); line-height: 1.7; margin-bottom: 32px; }
    .note-box {
      background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15));
      border: 1.5px solid rgba(245,158,11,0.3);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .note-title { font-size: 18px; font-weight: 700; color: #fbbf24; margin-bottom: 8px; }
    .note-msg { font-size: 14px; color: rgba(255,255,255,0.6); }
    .footer { padding: 24px 36px; border-top: 1px solid rgba(255,255,255,0.08); text-align: center; font-size: 12px; color: rgba(255,255,255,0.3); }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo">🔔 Reminder</div>
      </div>
      <div class="body">
        <div class="title">Note Reminder</div>
        <div class="desc">You set a reminder for the following note:</div>
        <div class="note-box">
          <div class="note-title">${noteTitle}</div>
          ${reminderMessage ? `<div class="note-msg">${reminderMessage}</div>` : ''}
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} NotesApp
      </div>
    </div>
  </div>
</body>
</html>
`;

export const sendVerificationOTP = async (email, name) => {
  const otp = generateOTP();
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '✦ Verify your NotesApp account',
    html: emailTemplate(
      `Welcome, ${name}! 👋`,
      `Thanks for signing up. Please verify your email address to activate your NotesApp account. Use the code below:`,
      otp
    ),
  });

  return otp;
};

export const sendPasswordResetOTP = async (email, name) => {
  const otp = generateOTP();
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '✦ Reset your NotesApp password',
    html: emailTemplate(
      `Password Reset Request`,
      `Hi ${name}, we received a request to reset the password for your account associated with <strong>${email}</strong>. Use the code below to reset your password:`,
      otp
    ),
  });

  return otp;
};

export const sendLoginOTP = async (email, name) => {
  const otp = generateOTP();
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: '✦ Your NotesApp login verification code',
    html: emailTemplate(
      `New login detected`,
      `Hi ${name}, a login attempt was made to your account. Use this OTP to complete your sign-in:`,
      otp
    ),
  });

  return otp;
};

export const sendReminderEmail = async (email, name, noteTitle, reminderMessage) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `🔔 Reminder: ${noteTitle}`,
    html: reminderTemplate(noteTitle, reminderMessage),
  });
};
