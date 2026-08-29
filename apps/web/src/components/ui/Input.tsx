import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string };
export const Input = forwardRef<HTMLInputElement, Props>(({ label, hint, error, className, id, ...props }, ref) => {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const descriptionId = `${inputId}-description`;
  return <div className="field">
    <label htmlFor={inputId}>{label}</label>
    <input ref={ref} id={inputId} className={cn('input', error && 'input--error', className)} aria-invalid={Boolean(error)} aria-describedby={(error || hint) ? descriptionId : undefined} {...props} />
    {(error || hint) && <span id={descriptionId} className={error ? 'field__error' : 'field__hint'}>{error || hint}</span>}
  </div>;
});
Input.displayName = 'Input';
