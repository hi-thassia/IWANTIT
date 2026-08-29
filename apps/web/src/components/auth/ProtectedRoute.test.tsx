import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

describe('ProtectedRoute', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Faça login.' }) })));
  it('redirects an unauthenticated visitor to login', async () => {
    render(<MemoryRouter initialEntries={['/app']}><AuthProvider><Routes><Route path="/app" element={<ProtectedRoute><p>Privado</p></ProtectedRoute>} /><Route path="/entrar" element={<p>Entrar agora</p>} /></Routes></AuthProvider></MemoryRouter>);
    expect(await screen.findByText('Entrar agora')).toBeVisible();
    expect(screen.queryByText('Privado')).not.toBeInTheDocument();
  });
});
