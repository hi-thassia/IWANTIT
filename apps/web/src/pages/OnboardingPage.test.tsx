import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { OnboardingPage } from './OnboardingPage';

const dependencies = vi.hoisted(() => ({ refresh: vi.fn(), api: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ refresh: dependencies.refresh }) }));
vi.mock('@/lib/api', () => ({ api: dependencies.api }));

describe('OnboardingPage', () => {
  beforeEach(() => {
    localStorage.setItem('iwantit-theme', 'light');
    dependencies.api.mockReset().mockResolvedValue({ message: 'ok' });
    dependencies.refresh.mockReset().mockResolvedValue(undefined);
  });

  it('presents all steps and completes the persisted flow', async () => {
    render(<ThemeProvider><MemoryRouter initialEntries={['/onboarding']}><Routes><Route path="/onboarding" element={<OnboardingPage />} /><Route path="/app" element={<p>Área privada</p>} /></Routes></MemoryRouter></ThemeProvider>);
    expect(screen.getByText('Um desejo, um objetivo.')).toBeVisible();
    expect(screen.getByText('Informe quanto você pretende pagar.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText('A busca acontece por você.')).toBeVisible();
    expect(screen.getByText('Você acompanha o melhor valor encontrado.')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }));
    expect(screen.getByText('A oportunidade chega até você.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /começar agora/i }));

    await waitFor(() => expect(dependencies.api).toHaveBeenCalledWith('/api/onboarding/complete', { method: 'POST' }));
    expect(dependencies.refresh).toHaveBeenCalledOnce();
    expect(await screen.findByText('Área privada')).toBeVisible();
  });
});
