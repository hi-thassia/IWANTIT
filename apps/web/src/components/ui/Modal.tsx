import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export function Modal({ trigger, title, description, children }: { trigger: ReactNode; title: string; description?: string; children: ReactNode }) {
  return <Dialog.Root><Dialog.Trigger asChild>{trigger}</Dialog.Trigger><Dialog.Portal>
    <Dialog.Overlay className="modal__overlay" />
    <Dialog.Content className="modal__content">
      <div className="modal__header"><div><Dialog.Title>{title}</Dialog.Title>{description && <Dialog.Description>{description}</Dialog.Description>}</div><Dialog.Close asChild><Button variant="ghost" size="sm" aria-label="Fechar modal"><X aria-hidden="true" /></Button></Dialog.Close></div>
      {children}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
