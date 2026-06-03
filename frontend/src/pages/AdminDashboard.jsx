import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, StickyNote, Paperclip, Shield, Search, ChevronLeft, ChevronRight, UserCheck, UserX, Eye, Trash2, ShieldCheck, ShieldOff, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="stat-card">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold font-display" style={{ color: 'var(--text-primary)' }}>{value}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      </div>
    </div>
  </div>
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => { if (!isAdmin) navigate('/dashboard'); }, [isAdmin]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data.stats);
    } catch { toast.error('Failed to load stats.'); }
  }, []);

  const fetchUsers = useCallback(async (q = '', p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 12 });
      if (q) params.set('search', q);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load users.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(userSearch, page), userSearch ? 300 : 0);
    return () => clearTimeout(t);
  }, [userSearch, page, fetchUsers]);

  const viewUser = async (userId) => {
    try {
      const { data } = await api.get(`/admin/users/${userId}`);
      setSelectedUser(data.user);
      setUserDetails(data.noteStats);
    } catch { toast.error('Failed to load user details.'); }
  };

  const toggleActive = async (userId) => {
    setActionLoading(userId);
    try {
      const { data } = await api.patch(`/admin/users/${userId}/toggle-active`);
      setUsers(us => us.map(u => u._id === userId ? { ...u, isActive: data.user.isActive } : u));
      if (selectedUser?._id === userId) setSelectedUser(s => ({ ...s, isActive: data.user.isActive }));
      toast.success(data.message);
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActionLoading(''); }
  };

  const changeRole = async (userId, role) => {
    setActionLoading(userId);
    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers(us => us.map(u => u._id === userId ? { ...u, role: data.user.role } : u));
      if (selectedUser?._id === userId) setSelectedUser(s => ({ ...s, role: data.user.role }));
      toast.success(data.message);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActionLoading(''); }
  };

  const deleteUser = async (userId) => {
    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(us => us.filter(u => u._id !== userId));
      setSelectedUser(null);
      toast.success('User deleted.');
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setActionLoading(''); }
  };

  return (
    <div className="min-h-screen bg-mesh">
      <div className="orb orb-1" /><div className="orb orb-2" />
      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 mb-6 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-tertiary)' }}>
            <Shield size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Admin Dashboard</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage users and monitor activity</p>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 animate-slide-up">
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#6366f1" />
            <StatCard icon={UserCheck} label="Active Users" value={stats.activeUsers} color="#10b981" />
            <StatCard icon={StickyNote} label="Total Notes" value={stats.totalNotes} color="#8b5cf6" />
            <StatCard icon={Paperclip} label="Attachments" value={stats.totalAttachments} color="#f59e0b" />
          </div>
        )}

        {/* Activity chart placeholder */}
        {stats?.notesPerDay?.length > 0 && (
          <div className="glass-strong p-5 mb-8 animate-fade-in">
            <h3 className="font-display font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp size={16} /> Notes Created (Last 7 Days)
            </h3>
            <div className="flex items-end gap-1 h-24">
              {stats.notesPerDay.map(d => {
                const max = Math.max(...stats.notesPerDay.map(x => x.count), 1);
                const h = Math.max((d.count / max) * 100, 4);
                return (
                  <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{d.count}</span>
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${h}%`, background: 'linear-gradient(to top, var(--accent-primary), var(--accent-secondary))' }} />
                    <span className="text-[9px]" style={{ color: 'var(--text-faint)' }}>{d._id.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* User List */}
          <div className="lg:col-span-2 glass-strong p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>Users</h3>
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Search users…" className="input-glass pl-9 py-2 text-sm" value={userSearch} onChange={e => { setUserSearch(e.target.value); setPage(1); }} />
              </div>
            </div>

            {loading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="shimmer h-14 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u._id} className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                    style={{ background: selectedUser?._id === u._id ? 'var(--accent-subtle)' : 'var(--bg-secondary)', border: `1px solid ${selectedUser?._id === u._id ? 'var(--accent-border)' : 'var(--border-primary)'}` }}
                    onClick={() => viewUser(u._id)}>
                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=6366f1&color=fff`}
                      className="w-9 h-9 rounded-lg object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {u.role === 'admin' && <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-tertiary)' }}>Admin</span>}
                      <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-glass !px-3 !py-1.5"><ChevronLeft size={14} /></button>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-glass !px-3 !py-1.5"><ChevronRight size={14} /></button>
              </div>
            )}
          </div>

          {/* User Detail Panel */}
          <div className="glass-strong p-5">
            {selectedUser ? (
              <div className="animate-fade-in">
                <div className="text-center mb-5">
                  <img src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name)}&background=6366f1&color=fff&size=120`}
                    className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover" alt="" />
                  <h3 className="font-display font-bold" style={{ color: 'var(--text-primary)' }}>{selectedUser.name}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedUser.email}</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedUser.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-tertiary)' }}>
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                {userDetails && (
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {[
                      { label: 'Notes', value: userDetails.totalNotes },
                      { label: 'Pinned', value: userDetails.pinnedNotes },
                      { label: 'Files', value: userDetails.totalAttachments },
                      { label: 'Shared', value: userDetails.sharedNotes },
                    ].map(s => (
                      <div key={s.label} className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-secondary)' }}>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
                        <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>
                  Joined {new Date(selectedUser.createdAt).toLocaleDateString()}
                  {selectedUser.googleId && ' • Google account'}
                </p>

                <div className="space-y-2">
                  <button onClick={() => toggleActive(selectedUser._id)} disabled={actionLoading === selectedUser._id}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                    {selectedUser.isActive ? <><UserX size={14} /> Deactivate</> : <><UserCheck size={14} /> Activate</>}
                  </button>
                  <button onClick={() => changeRole(selectedUser._id, selectedUser.role === 'admin' ? 'user' : 'admin')} disabled={actionLoading === selectedUser._id}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--accent-tertiary)' }}>
                    {selectedUser.role === 'admin' ? <><ShieldOff size={14} /> Remove Admin</> : <><ShieldCheck size={14} /> Make Admin</>}
                  </button>
                  <button onClick={() => deleteUser(selectedUser._id)} disabled={actionLoading === selectedUser._id}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)' }}>
                    <Trash2 size={14} /> Delete User
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Eye size={32} className="mb-3" style={{ color: 'var(--text-faint)' }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a user to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
