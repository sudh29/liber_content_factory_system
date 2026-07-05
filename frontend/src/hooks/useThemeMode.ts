import { useState } from 'react';

export function useThemeMode() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('quotes_theme_mode') === 'dark';
    } catch {
      return false;
    }
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('quotes_theme_mode', next ? 'dark' : 'light');
      } catch (error) {
        console.error(error);
      }
      return next;
    });
  };

  return { isDarkMode, toggleDarkMode };
}
