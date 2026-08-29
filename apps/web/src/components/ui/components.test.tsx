import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, Input, Modal } from '.';

describe('design system', () => {
  it('disables a loading button and exposes its state', () => {
    render(<Button loading>Salvar</Button>);
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('associates validation feedback with its input', () => {
    render(<Input label="E-mail" error="E-mail inválido" />);
    expect(screen.getByLabelText('E-mail')).toHaveAccessibleDescription('E-mail inválido');
  });

  it('opens an accessible modal', () => {
    render(<Modal trigger={<Button>Abrir</Button>} title="Título">Conteúdo</Modal>);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(screen.getByRole('dialog', { name: 'Título' })).toBeVisible();
  });
});
