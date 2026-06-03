import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import OTPInput from '../components/auth/OTPInput';
import ThemeToggle from '../components/layout/ThemeToggle';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState('login');
  const [form, setForm] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const iv = setInterval(() => {
      setResendTimer(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; });
    }, 1000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill in all fields.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name.split(' ')[0]}! ✦`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed.';
      if (err.response?.data?.requiresVerification) {
        setUserId(err.response.data.userId);
        setStep('verify');
        startResendTimer();
        toast('OTP sent to your email for verification.', { icon: '📧' });
      } else { toast.error(msg); }
    } finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (otp.length < 6) return toast.error('Enter the 6-digit OTP.');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-email', { userId, otp });
      login(data.token, data.user);
      toast.success('Email verified! Welcome ✦');
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
            {step === 'login' ? 'Sign in to your workspace' : 'Verify your email'}
          </p>
        </div>

        <div className="glass-strong p-6 sm:p-8">
          {step === 'login' ? (
            <>
              <h1 className="font-display text-2xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Welcome back</h1>
              <button onClick={handleGoogle} className="btn-google mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
              <div className="divider">or continue with email</div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input type="email" placeholder="you@example.com" className="input-glass pl-10" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="email" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input type={showPass ? 'text' : 'password'} placeholder="••••••••" className="input-glass pl-10 pr-10"
                      value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">Forgot password?</Link>
                </div>
                <button type="submit" className="btn-primary mt-2" disabled={loading}>
                  {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</span> : 'Sign In'}
                </button>
              </form>
              <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
                No account?{' '}<Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Create one</Link>
              </p>
            </>
          ) : (
            <div className="animate-slide-up">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
                  style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)' }}>📧</div>
                <h2 className="font-display text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Check your email</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  We sent a 6-digit verification code to<br /><span className="text-violet-400 font-medium">{form.email}</span>
                </p>
              </div>
              <OTPInput value={otp} onChange={setOtp} />
              <button onClick={handleVerify} className="btn-primary mt-8" disabled={loading || otp.length < 6}>
                {loading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</span> : 'Verify & Continue'}
              </button>
              <div className="flex items-center justify-between mt-5">
                <button onClick={() => { setStep('login'); setOtp(''); }} className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}>← Back to login</button>
                <button onClick={handleResend} disabled={resendTimer > 0} className="text-xs text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-40">
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
