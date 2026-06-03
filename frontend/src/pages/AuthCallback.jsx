import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const name = params.get('name');
    const email = params.get('email');
    const avatar = params.get('avatar');
    const role = params.get('role') || 'user';
    const error = params.get('error');

    if (error) {
      toast.error('Google sign-in failed. Please try again.');
      navigate('/login');
      return;
    }

    if (token && name && email) {
      const user = { name, email, avatar: avatar || '', role };
      login(token, user);
      toast.success(`Welcome, ${name.split(' ')[0]}! ✦`);
      navigate('/dashboard');
    } else {
      toast.error('Authentication failed.');
      navigate('/login');
    }
  }, []);

  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="flex flex-col items-center gap-5 relative z-10">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>
          <Sparkles size={24} className="text-white" />
        </div>
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        <p className="text-sm font-display" style={{ color: 'var(--text-muted)' }}>Completing sign in…</p>
      </div>
    </div>
  );
}
