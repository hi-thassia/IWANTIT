import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';

const deps = vi.hoisted(() => ({ api: vi.fn(), refresh: vi.fn(), setTheme: vi.fn() }));
const user = { id: 'u1', name: 'Ana Souza', email: 'ana@example.com', avatarUrl: null, twoFactorEnabled: false, onboardingCompleted: true, theme: 'light' as const, loginMethods: ['password' as const, 'google' as const] };
const notifications = { priceTargetAlert: true, priceDropAlert: true, newLowAlert: true, stockAlert: true };
vi.mock('@/lib/api', () => ({ api: deps.api, ApiRequestError: class extends Error {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user, refresh: deps.refresh, logout: vi.fn() }) }));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', setTheme: deps.setTheme, toggleTheme: vi.fn() }) }));

describe('ProfilePage', () => {
  beforeEach(() => { deps.api.mockReset().mockImplementation((path: string) => path === '/api/profile' ? Promise.resolve({ user, notifications }) : Promise.resolve({})); deps.refresh.mockReset().mockResolvedValue(undefined); deps.setTheme.mockReset(); });
  afterEach(cleanup);

  it('loads account data and exposes every settings area without fake wishes', async () => {
    render(<MemoryRouter><ProfilePage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Perfil e configurações' })).toBeVisible();
    expect(screen.getByDisplayValue('Ana Souza')).toBeVisible();
    expect(screen.getByText('Google')).toBeVisible();
    expect(screen.getByText('E-mail e senha')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Abrir meus desejos' })).toHaveAttribute('href', '/desejos');
  });

  it('updates name, theme and notification preferences', async () => {
    render(<MemoryRouter><ProfilePage /></MemoryRouter>); await screen.findByDisplayValue('Ana Souza');
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Lima' } }); fireEvent.click(screen.getByRole('button', { name: 'Salvar nome' }));
    await waitFor(() => expect(deps.api).toHaveBeenCalledWith('/api/profile/name', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Ana Lima' }) })));
    fireEvent.click(screen.getByRole('button', { name: 'Escuro' })); expect(deps.setTheme).toHaveBeenCalledWith('dark');
    fireEvent.click(screen.getByLabelText('Preço desejado'));
    await waitFor(() => expect(deps.api).toHaveBeenCalledWith('/api/profile/notifications', expect.objectContaining({ method: 'PATCH' })));
  });
});
