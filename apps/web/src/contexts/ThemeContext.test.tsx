import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function Consumer() { const { theme, toggleTheme } = useTheme(); return <button onClick={toggleTheme}>{theme}</button>; }

describe('ThemeProvider', () => {
  beforeEach(() => { localStorage.clear(); vi.stubGlobal('matchMedia', () => ({ matches: false })); });
  it('toggles and persists the selected theme', () => {
    render(<ThemeProvider><Consumer /></ThemeProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'light' }));
    expect(screen.getByRole('button', { name: 'dark' })).toBeVisible();
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('iwantit-theme')).toBe('dark');
  });
});
