import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock, Trash2, Moon, Sun, Monitor, HardDrive, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser, logout, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const storagePct = user?.storageLimit ? Math.round((user.storageUsed / user.storageLimit) * 100) : 0;
  const formatMB = (b) => ((b || 0) / (1024 * 1024)).toFixed(1) + ' MB';

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim()) return toast.error('Name is required.');
    setLoading('profile');
    try {
      const { data } = await api.put('/auth/profile', { name: profileForm.name });
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setLoading(''); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) return toast.error('Min 6 characters.');
    if (passwordForm.newPassword !== passwordForm.confirm) return toast.error('Passwords do not match.');
    setLoading('password');
    try {
      await api.put('/auth/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      setPasswordForm({ currentPassword: '', newPassword: '', confirm: '' });
      toast.success('Password changed!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setLoading(''); }
  };

  const handleDeleteAccount = async () => {
    setLoading('delete');
    try {
      await api.delete('/auth/account');
      logout();
      toast.success('Account deleted.');
      navigate('/login');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setLoading(''); }
  };

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="min-h-screen bg-mesh">
      <div className="orb orb-1" /><div className="orb orb-2" />
      <div className="relative z-10 max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 mb-6 text-sm transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-8" style={{ color: 'var(--text-primary)' }}>Settings</h1>

        {/* Theme */}
        <section className="glass-strong p-5 sm:p-6 mb-4">
          <h2 className="font-display font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Sun size={16} /> Appearance
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(t => (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl transition-all duration-200"
                style={{ background: theme === t.id ? 'var(--accent-subtle)' : 'var(--bg-secondary)', border: `1.5px solid ${theme === t.id ? 'var(--accent-border)' : 'var(--border-primary)'}`, color: theme === t.id ? 'var(--accent-tertiary)' : 'var(--text-muted)' }}>
                <t.icon size={20} />
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Storage */}
        <section className="glass-strong p-5 sm:p-6 mb-4">
          <h2 className="font-display font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <HardDrive size={16} /> Storage
            {isAdmin && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-tertiary)' }}>Admin</span>}
          </h2>
          <div className="storage-bar mb-2">
            <div className={`storage-bar-fill ${storagePct > 90 ? 'danger' : storagePct > 70 ? 'warning' : ''}`} style={{ width: `${Math.min(storagePct, 100)}%` }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            {formatMB(user?.storageUsed)} of {formatMB(user?.storageLimit)} used ({storagePct}%)
          </p>
        </section>

        {/* Profile */}
        <section className="glass-strong p-5 sm:p-6 mb-4">
          <h2 className="font-display font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <User size={16} /> Profile
          </h2>
          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div>
              <label className="block text-xs mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Name</label>
              <input type="text" className="input-glass" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs mb-1.5 font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Email</label>
              <input type="email" className="input-glass opacity-60" value={user?.email || ''} disabled />
            </div>
            <button type="submit" className="btn-primary" disabled={loading === 'profile'}>
              {loading === 'profile' ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="glass-strong p-5 sm:p-6 mb-4">
          <h2 className="font-display font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Lock size={16} /> Change Password
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input type="password" className="input-glass" placeholder="Current password" value={passwordForm.currentPassword}
              onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))} />
            <input type="password" className="input-glass" placeholder="New password" value={passwordForm.newPassword}
              onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))} />
            <input type="password" className="input-glass" placeholder="Confirm new password" value={passwordForm.confirm}
              onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} />
            <button type="submit" className="btn-primary" disabled={loading === 'password'}>
              {loading === 'password' ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </section>

        {/* Delete Account */}
        <section className="glass-strong p-5 sm:p-6 mb-4" style={{ borderColor: 'var(--danger-border)' }}>
          <h2 className="font-display font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--danger)' }}>
            <Trash2 size={16} /> Danger Zone
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>
            Permanently delete your account and all data. This cannot be undone.
          </p>
          {!deleteConfirm ? (
            <button onClick={() => setDeleteConfirm(true)} className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger-border)' }}>
              Delete My Account
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="btn-glass flex-1">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={loading === 'delete'}
                className="flex-1 py-2.5 px-5 rounded-xl font-semibold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                {loading === 'delete' ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
