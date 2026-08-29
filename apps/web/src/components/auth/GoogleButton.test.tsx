import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GoogleButton } from './GoogleButton';

describe('GoogleButton', () => {
  it('starts the server-side Google OAuth flow', () => {
    render(<GoogleButton />);
    expect(screen.getByRole('link', { name: 'Continuar com Google' })).toHaveAttribute('href', 'http://localhost:3333/api/auth/google');
  });
});
