import { Moon, Sparkles, Sun } from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useTheme } from '@/contexts/ThemeContext';

export function AuthLayout({ title, subtitle, children, footer }: PropsWithChildren<{ title: string; subtitle: string; footer?: ReactNode }>) {
  const { theme, toggleTheme } = useTheme();
  return <main className="auth-page">
    <div className="auth-topbar"><Link className="brand" to="/" aria-label="I Want It — início"><span className="brand__mark"><Sparkles aria-hidden="true" /></span><span>I Want It</span></Link><Button variant="ghost" size="sm" onClick={toggleTheme} aria-label={`Ativar tema ${theme === 'light' ? 'escuro' : 'claro'}`}>{theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</Button></div>
    <section className="auth-panel"><div className="auth-copy"><span className="section-kicker">Sua wishlist inteligente</span><h1>{title}</h1><p>{subtitle}</p></div><div className="auth-card">{children}{footer && <div className="auth-footer">{footer}</div>}</div></section>
    <p className="auth-legal">Seus dados protegidos. Seus desejos, só seus.</p>
  </main>;
}
