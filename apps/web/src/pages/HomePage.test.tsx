import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';

const dependencies = vi.hoisted(() => ({
  logout: vi.fn(),
  toggleTheme: vi.fn(),
  api: vi.fn(),
  theme: 'light' as 'light' | 'dark',
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({
  user: { id: 'user-1', name: 'Ana Souza', email: 'ana@example.com', avatarUrl: null, twoFactorEnabled: false, onboardingCompleted: true, theme: 'light', loginMethods: ['password'] },
  logout: dependencies.logout,
}) }));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: dependencies.theme, toggleTheme: dependencies.toggleTheme }) }));
vi.mock('@/lib/api', () => ({ api: dependencies.api }));

describe('HomePage', () => {
  beforeEach(() => { dependencies.logout.mockReset().mockResolvedValue(undefined); dependencies.toggleTheme.mockReset(); dependencies.api.mockReset().mockImplementation((path: string) => Promise.resolve(path === '/api/wishes' ? { wishes: [] } : { alerts: [] })); });
  afterEach(cleanup);

  it('shows honest empty states and working entry points', async () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'O que você quer comprar?' })).toBeVisible();
    expect(screen.getByRole('link', { name: /colar link/i })).toHaveAttribute('href', '/desejos/novo?modo=link');
    expect(screen.getByRole('link', { name: /buscar produto/i })).toHaveAttribute('href', '/desejos/novo');
    expect(screen.getByRole('link', { name: /enviar imagem/i })).toHaveAttribute('href', '/desejos/novo?modo=imagem');
    expect(await screen.findByText('Nenhum monitoramento ativo. Seus acompanhamentos aparecerão aqui quando você adicionar um desejo.')).toBeVisible();
    expect(screen.getByText('Você ainda não tem alertas de preço.')).toBeVisible();
  });

  it('opens account navigation and reaches security', () => {
    render(<MemoryRouter initialEntries={['/app']}><Routes><Route path="/app" element={<HomePage />} /><Route path="/seguranca" element={<p>Página de segurança</p>} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /ana souza/i }));
    expect(screen.getByText('ana@example.com')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Perfil' })).toHaveAttribute('href', '/perfil');
    fireEvent.click(screen.getByRole('link', { name: 'Segurança' }));
    expect(screen.getByText('Página de segurança')).toBeVisible();
  });

  it('switches theme and logs out through the account menu', async () => {
    render(<MemoryRouter initialEntries={['/app']}><Routes><Route path="/app" element={<HomePage />} /><Route path="/entrar" element={<p>Login</p>} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Ativar tema escuro' }));
    expect(dependencies.toggleTheme).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: /ana souza/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(await screen.findByText('Login')).toBeVisible();
    expect(dependencies.logout).toHaveBeenCalledOnce();
  });
});
