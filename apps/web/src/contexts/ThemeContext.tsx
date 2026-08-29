import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

type Theme = 'light' | 'dark';
type ThemeContextValue = { theme: Theme; toggleTheme: () => void; setTheme: (theme: Theme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('iwantit-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('iwantit-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0A0A0B' : '#FFFFFF');
  }, [theme]);
  const value = useMemo(() => ({ theme, setTheme, toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light') }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
