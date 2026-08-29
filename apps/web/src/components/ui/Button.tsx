import { Slot } from '@radix-ui/react-slot';
import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; children: ReactNode;
};
export function Button({ asChild, variant = 'primary', size = 'md', loading, className, disabled, children, ...props }: Props) {
  const classes = cn('button', `button--${variant}`, `button--${size}`, className);
  if (asChild) return <Slot className={classes} aria-disabled={disabled || loading || undefined} aria-busy={loading || undefined} {...props}>{children}</Slot>;
  return <button className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    {loading && <LoaderCircle className="spinner" aria-hidden="true" />}<span>{children}</span>
  </button>;
}
