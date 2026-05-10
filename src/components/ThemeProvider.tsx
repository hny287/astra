'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAppData } from './AppDataProvider';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', toggleTheme: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { preferences, setPreference } = useAppData();
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = preferences['theme'];
    const resolved: Theme = saved === 'dark' ? 'dark' : 'light';
    setTheme(resolved);
    document.documentElement.dataset.theme = resolved;
  }, [preferences]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    setPreference('theme', next);
  }, [theme, setPreference]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}