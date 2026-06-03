import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, User, ChevronDown, Search, X, Moon, Sun, Monitor, Shield, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const THEME_LABELS = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export default function Navbar({ search, onSearch }) {
  const { user, logout, isAdmin } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully.');
    navigate('/login');
  };

  const ThemeIcon = THEME_ICONS[theme];

  const avatarUrl = user?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff&size=80`;

  return (
    <nav className="glass-nav sticky top-0 z-50 px-3 sm:px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center gap-2 sm:gap-4">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa)' }}>
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg hidden md:block" style={{ color: 'var(--text-primary)' }}>Secure Notes Hub</span>
        </Link>

        {/* Search */}
        <div className={`flex-1 max-w-xl relative transition-all duration-200 ${searchFocus ? 'max-w-2xl' : ''}`}>
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search notes, tags…"
            value={search}
            onChange={e => onSearch(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            className="input-glass pl-10 pr-9 py-2.5 text-sm w-full"
          />
          {search && (
            <button onClick={() => onSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0 hover:scale-105"
          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}
          title={`Theme: ${THEME_LABELS[theme]}`}
        >
          <ThemeIcon size={16} />
        </button>

        {/* User Menu */}
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(s => !s)}
            className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-xl transition-all duration-200"
            style={{
              background: menuOpen ? 'var(--bg-hover)' : undefined,
              color: 'var(--text-primary)',
            }}
          >
            <img src={avatarUrl} alt={user?.name}
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff`; }}
            />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium leading-tight max-w-[120px] truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
              <p className="text-xs leading-tight max-w-[120px] truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 glass-strong py-1.5 animate-fade-in" style={{ borderRadius: '16px' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-primary)' }}>
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-tertiary)', border: '1px solid var(--accent-border)' }}>
                    <Shield size={10} /> Admin
                  </span>
                )}
              </div>

              <button
                onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mt-1"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Settings size={15} />
                Settings
              </button>

              {isAdmin && (
                <button
                  onClick={() => { navigate('/admin'); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--accent-tertiary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Shield size={15} />
                  Admin Dashboard
                </button>
              )}

              <div style={{ margin: '4px 0', borderTop: '1px solid var(--border-primary)' }} />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                style={{ color: 'var(--danger)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
