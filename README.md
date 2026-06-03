# ✦ NotesApp — Full Stack Glassmorphic Notes Application

A full-featured notes application with glassmorphic UI built with:
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas
- **Auth**: JWT + Google OAuth + Email OTP

---
# admin login
email:dd9425389@gmail.com
password:admin@123


## 📁 Project Structure

```
notes-app/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── passport.js        # Google OAuth strategy
│   ├── middleware/
│   │   └── auth.js            # JWT protect middleware
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Note.js            # Note schema
│   ├── routes/
│   │   ├── auth.js            # Auth routes
│   │   └── notes.js           # Notes CRUD routes
│   ├── utils/
│   │   ├── email.js           # OTP email templates
│   │   └── jwt.js             # JWT helpers
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   │   └── OTPInput.jsx
    │   │   ├── layout/
    │   │   │   └── Navbar.jsx
    │   │   └── notes/
    │   │       ├── NoteCard.jsx
    │   │       └── NoteModal.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Signup.jsx
    │   │   ├── ForgotPassword.jsx
    │   │   ├── Dashboard.jsx
    │   │   └── AuthCallback.jsx
    │   ├── utils/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

---

## 🚀 Setup & Installation

### Step 1 — MongoDB Atlas

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a free cluster
3. Click **Connect** → **Drivers** → copy connection string
4. Replace `<password>` with your DB user password
5. Paste in `MONGODB_URI` in `backend/.env`

### Step 2 — Gmail App Password (for OTP emails)

1. Enable 2-Factor Authentication on your Google Account
2. Go to **Google Account → Security → App Passwords**
3. Generate a new App Password for "Mail"
4. Use this password as `EMAIL_PASS` in `.env`
5. Use your Gmail as `EMAIL_USER`

### Step 3 — Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Go to **APIs & Services → Credentials**
4. Create **OAuth 2.0 Client ID** → Web application
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
6. Copy **Client ID** and **Client Secret** to `backend/.env`
7. Copy **Client ID** to `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`

### Step 4 — Install & Run

```bash
# ── Backend ──────────────────────────
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev
# Runs on http://localhost:5000

# ── Frontend ─────────────────────────
cd frontend
cp .env.example .env
# Set VITE_GOOGLE_CLIENT_ID
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## 🔑 Backend .env Reference

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/notesapp
JWT_SECRET=your_long_random_secret_key
JWT_EXPIRES_IN=7d

PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_FROM="Notes App <your_gmail@gmail.com>"

GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

---

## 🌐 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register + send email OTP |
| POST | `/api/auth/verify-email` | Verify OTP → issue JWT |
| POST | `/api/auth/login` | Login with email + password |
| POST | `/api/auth/forgot-password` | Send password reset OTP |
| POST | `/api/auth/verify-reset-otp` | Verify reset OTP |
| POST | `/api/auth/reset-password` | Set new password |
| POST | `/api/auth/resend-otp` | Resend any OTP |
| GET | `/api/auth/google` | Start Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/me` | Get current user (protected) |

### Notes (all protected with JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes` | Get all notes (search + tag filter) |
| POST | `/api/notes` | Create note |
| PUT | `/api/notes/:id` | Update note |
| DELETE | `/api/notes/:id` | Delete note |
| PATCH | `/api/notes/:id/pin` | Toggle pin |

---

## ✨ Features

- **Auth**: Signup/Login with email + OTP email verification
- **Google OAuth**: One-click Google sign in/up
- **Forgot Password**: 3-step flow — email → OTP → new password
- **JWT Sessions**: 7-day tokens, auto-refresh on app load
- **Notes CRUD**: Create, read, update, delete notes
- **Note Colors**: 7 color themes per note
- **Pinning**: Pin important notes to the top
- **Tags**: Add up to 8 tags per note, filter by tag
- **Search**: Full-text search across title, content, and tags
- **Grid/List view**: Toggle between views
- **Glassmorphic UI**: Full dark glass design with mesh gradients
- **Responsive**: Mobile FAB, tablet and desktop layouts
- **Rate limiting**: Auth endpoints rate limited

---

## 🎨 Design Tokens

| Token | Value |
|-------|-------|
| Font Display | Syne |
| Font Body | DM Sans |
| Font Mono | JetBrains Mono |
| Primary | Indigo → Violet gradient |
| Background | `#07071a` |
| Glass | `rgba(255,255,255,0.08)` + `blur(40px)` |
| Border | `rgba(255,255,255,0.14)` |

---

## 🚢 Production Deployment

### Backend (Railway / Render / Fly.io)
- Set all environment variables
- Change `CLIENT_URL` to your frontend domain
- Change `GOOGLE_CALLBACK_URL` to your backend domain

### Frontend (Vercel / Netlify)
- Set `VITE_API_URL` to your backend API URL
- Build command: `npm run build`
- Output: `dist/`
