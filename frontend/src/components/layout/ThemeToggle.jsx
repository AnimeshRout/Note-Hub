import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };
const THEME_LABELS = { light: 'Light', dark: 'Dark', system: 'System' };
const THEME_ORDER = ['light', 'dark', 'system'];

export default function ThemeToggle({ floating = false }) {
  const { theme, cycleTheme } = useTheme();
  const Icon = THEME_ICONS[theme];

  if (floating) {
    return (
      <button
        onClick={cycleTheme}
        className="fixed top-4 right-4 z-50 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105 group"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-secondary)',
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(20px)',
        }}
        title={`Theme: ${THEME_LABELS[theme]}`}
      >
        <Icon size={17} />
        <span className="absolute right-full mr-2 px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
          {THEME_LABELS[theme]}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={cycleTheme}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        color: 'var(--text-secondary)',
      }}
      title={`Theme: ${THEME_LABELS[theme]}`}
    >
      <Icon size={16} />
    </button>
  );
}
