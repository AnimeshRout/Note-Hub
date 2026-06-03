import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Sparkles, ArrowLeft } from 'lucide-react';
import ThemeToggle from '../components/layout/ThemeToggle';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import OTPInput from '../components/auth/OTPInput';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState(null);
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const iv = setInterval(() => { setResendTimer(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }); }, 1000);
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      if (data.userId) { setUserId(data.userId); setStep('otp'); startResendTimer(); }
      toast.success('OTP sent to your email!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send OTP.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) return toast.error('Enter the 6-digit OTP.');
    setLoading(true);
    try {
      await api.post('/auth/verify-reset-otp', { userId, otp });
      setStep('reset');
      toast.success('OTP verified! Set your new password.');
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid OTP.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try { await api.post('/auth/resend-otp', { userId, type: 'reset_password' }); toast.success('OTP resent!'); startResendTimer(); }
    catch { toast.error('Failed to resend OTP.'); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (passwords.new.length < 6) return toast.error('Password must be at least 6 characters.');
    if (passwords.new !== passwords.confirm) return toast.error('Passwords do not match.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/reset-password', { userId, otp, newPassword: passwords.new });
      login(data.token, data.user);
      toast.success('Password reset successfully! ✦');
      navigate('/dashboard');
    } catch (err) { toast.error(err.response?.data?.message || 'Reset failed.'); }
    finally { setLoading(false); }
  };

  const stepInfo = {
    email: { icon: '🔑', title: 'Reset password', desc: "Enter your email and we'll send you an OTP" },
    otp: { icon: '📧', title: 'Check your email', desc: `We sent a code to ${email}` },
    reset: { icon: '🔐', title: 'New password', desc: 'Choose a strong, memorable password' },
  };
  const info = stepInfo[step];

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center p-4 relative">
      <ThemeToggle floating />
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>NotesApp</span>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['email', 'otp', 'reset'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                s === step ? 'bg-violet-500 text-white' :
                ['email', 'otp', 'reset'].indexOf(step) > i ? 'bg-violet-500/30 text-violet-300' : ''
              }`} style={{ background: s !== step && ['email', 'otp', 'reset'].indexOf(step) <= i ? 'var(--bg-secondary)' : undefined,
                color: s !== step && ['email', 'otp', 'reset'].indexOf(step) <= i ? 'var(--text-muted)' : undefined }}>{i + 1}</div>
              {i < 2 && <div className="w-8 h-px transition-all duration-300" style={{ background: ['email', 'otp', 'reset'].indexOf(step) > i ? 'rgba(139,92,246,0.5)' : 'var(--border-primary)' }} />}
            </div>
          ))}
        </div>

        <div className="glass-strong p-6 sm:p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
              style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>{info.icon}</div>
            <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{info.title}</h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{info.desc}</p>
          </div>

          {step === 'email' && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input type="email" placeholder="you@example.com" className="input-glass pl-10" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
                </div>
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Sending OTP…' : 'Send Reset Code'}</button>
            </form>
          )}

          {step === 'otp' && (
            <div className="animate-slide-up">
              <OTPInput value={otp} onChange={setOtp} />
              <input type="text" maxLength={6} placeholder="Enter 6-digit OTP" className="input-glass text-center tracking-widest text-lg mt-4"
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              <button onClick={handleVerifyOTP} className="btn-primary mt-8" disabled={loading || otp.length < 6}>
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>
              <div className="flex items-center justify-between mt-5">
                <button onClick={() => { setStep('email'); setOtp(''); }} className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <ArrowLeft size={12} /> Back
                </button>
                <button onClick={handleResend} disabled={resendTimer > 0} className="text-xs text-violet-400 disabled:opacity-40">
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-slide-up">
              <input type="password" className="input-glass" placeholder="New password" value={passwords.new}
                onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} />
              <input type="password" className="input-glass" placeholder="Confirm password" value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} />
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Resetting…' : 'Reset Password'}</button>
            </form>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors">← Back to login</Link>
        </p>
      </div>
    </div>
  );
}
