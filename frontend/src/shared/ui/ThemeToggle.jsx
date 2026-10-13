import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../app/context/ThemeContext';

export function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-2.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-yellow-signal hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm ${className}`}
      aria-label="Toggle color theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
