"use client";

import React, { useEffect, useState } from 'react';
import { IcoSun, IcoMoon } from './icons';

type Theme = 'dark' | 'light';
const KEY = 'wadmin-theme';

function apply(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const cur = (document.documentElement.getAttribute('data-theme') as Theme) || 'dark';
    setTheme(cur);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    apply(next);
  };

  const dark = theme === 'dark';
  return (
    <button className="theme-toggle" onClick={toggle} type="button" aria-label="Theme switch">
      <span className="tt-ic">
        {dark ? <IcoMoon /> : <IcoSun />}
        <span>{dark ? 'Бараан горим' : 'Цайвар горим'}</span>
      </span>
      <span className="tt-state">{dark ? 'Light →' : 'Dark →'}</span>
    </button>
  );
}
