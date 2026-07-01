import { useCallback, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

function initial(): Theme {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('bushi-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  }
  return 'dark';
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('bushi-theme', theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, toggle };
}
