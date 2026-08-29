import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@iwantit/shared';
import { OnboardingGate } from './OnboardingGate';

const auth = vi.hoisted(() => ({ user: null as AuthUser | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

describe('OnboardingGate', () => {
  const user = { id: 'user-1', name: 'Ana', email: 'ana@example.com', avatarUrl: null, twoFactorEnabled: false, theme: 'light' as const, loginMethods: ['password' as const] };

  it('redirects a user who has not completed onboarding', () => {
    auth.user = { ...user, onboardingCompleted: false };
    render(<MemoryRouter initialEntries={['/app']}><Routes><Route path="/app" element={<OnboardingGate><p>Aplicativo</p></OnboardingGate>} /><Route path="/onboarding" element={<p>Apresentação</p>} /></Routes></MemoryRouter>);
    expect(screen.getByText('Apresentação')).toBeVisible();
  });

  it('allows a user who already completed onboarding', () => {
    auth.user = { ...user, onboardingCompleted: true };
    render(<MemoryRouter initialEntries={['/app']}><Routes><Route path="/app" element={<OnboardingGate><p>Aplicativo</p></OnboardingGate>} /><Route path="/onboarding" element={<p>Apresentação</p>} /></Routes></MemoryRouter>);
    expect(screen.getByText('Aplicativo')).toBeVisible();
  });
});
