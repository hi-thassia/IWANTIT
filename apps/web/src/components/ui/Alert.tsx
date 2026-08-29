import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
const icons = { info: Info, success: CheckCircle2, warning: TriangleAlert, danger: AlertCircle };
export function Alert({ variant = 'info', title, children }: { variant?: keyof typeof icons; title: string; children?: ReactNode }) {
  const Icon = icons[variant];
  return <div className={`alert alert--${variant}`} role={variant === 'danger' ? 'alert' : 'status'}><Icon aria-hidden="true" /><div><strong>{title}</strong>{children && <p>{children}</p>}</div></div>;
}
