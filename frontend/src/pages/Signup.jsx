import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import ThemeToggle from '../components/layout/ThemeToggle';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import OTPInput from '../components/auth/OTPInput';

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState('signup');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const iv = setInterval(() => { setResendTimer(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }); }, 1000);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return toast.error('All fields are required.');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/signup', form);
      setUserId(data.userId);
      setStep('verify');
      startResendTimer();
      toast.success('Account created! Check your email for OTP.');
    } catch (err) { toast.error(err.response?.data?.message || 'Signup failed.'); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (otp.length < 6) return toast.error('Enter the 6-digit OTP.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { userId, otp });
      login(data.token, data.user);
      toast.success(`Welcome to Secure Notes Hub, ${data.user.name.split(' ')[0]}! ✦`);
      navigate('/dashboard');
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid OTP.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    try { await api.post('/auth/resend-otp', { userId, type: 'verify_email' }); toast.success('OTP resent!'); startResendTimer(); }
    catch { toast.error('Failed to resend OTP.'); }
  };

  const handleGoogle = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/auth/google`;
  };

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
            <span className="font-display text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Secure Notes Hub</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {step === 'signup' ? 'Create your free account' : 'Verify your email'}
          </p>
        </div>

        <div className="glass-strong p-6 sm:p-8">
          {step === 'signup' ? (
            <>
              <h1 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Get started</h1>
              <button onClick={handleGoogle} className="btn-google mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign up with Google
              </button>
              <div className="divider">or sign up with email</div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-xs mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Full Name</label>
                  <input type="text" className="input-glass" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</label>
                  <input type="email" className="input-glass" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Password</label>
                  <input type={showPass ? 'text' : 'password'} className="input-glass" value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </form>
              <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
                Already have an account?{' '}<Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
              </p>
            </>
          ) : (
            <div className="animate-slide-up">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>📧</div>
                <h2 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Verify your email</h2>
              </div>
              <OTPInput value={otp} onChange={setOtp} />
              <input type="text" maxLength={6} placeholder="Enter 6-digit OTP"
                className="input-glass text-center tracking-widest text-lg mt-4" value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
              <button onClick={handleVerify} className="btn-primary mt-4" disabled={loading || otp.length < 6}>
                {loading ? 'Verifying...' : 'Verify'}
              </button>
              <div className="flex items-center justify-between mt-4">
                <button onClick={() => { setStep('signup'); setOtp(''); }} className="text-xs" style={{ color: 'var(--text-muted)' }}>← Back</button>
                <button onClick={handleResend} disabled={resendTimer > 0} className="text-xs text-violet-400 disabled:opacity-40">
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
