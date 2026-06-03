import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const THEMES = ['light', 'dark', 'system'];

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'system';
    } catch {
      return 'system';
    }
  });

  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('theme', theme);
  }, [theme, resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      document.documentElement.setAttribute('data-theme', getSystemTheme());
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme(t => {
      const idx = THEMES.indexOf(t);
      return THEMES[(idx + 1) % THEMES.length];
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
