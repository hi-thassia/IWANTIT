import { Bell, ChevronDown, CircleHelp, Heart, Home, LogOut, Menu, Moon, ShieldCheck, Sparkles, Sun, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Container } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  async function leave() {
    await logout();
    navigate('/entrar', { replace: true });
  }

  return <header className="app-header">
    <Container className="app-header__inner">
      <Link className="brand" to="/app" aria-label="I Want It — início"><span className="brand__mark"><Sparkles aria-hidden="true" /></span><span>I Want It</span></Link>
      <nav className="app-nav" aria-label="Navegação principal">
        <Link className="app-nav__link is-active" to="/app"><Home aria-hidden="true" /> Início</Link>
        <Link className="app-nav__link" to="/desejos"><Heart aria-hidden="true" /> Desejos</Link>
        <Link className="app-nav__link" to="/alertas"><Bell aria-hidden="true" /> Alertas</Link>
      </nav>
      <div className="app-header__actions">
        <Button className="desktop-theme" variant="ghost" size="sm" onClick={toggleTheme} aria-label={`Ativar tema ${theme === 'light' ? 'escuro' : 'claro'}`}>{theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</Button>
        <button className="account-trigger" type="button" aria-expanded={menuOpen} aria-controls="account-menu" onClick={() => setMenuOpen((open) => !open)}>
          <span className="account-avatar" aria-hidden="true">{user?.name.charAt(0).toUpperCase()}</span>
          <span className="account-trigger__name">{user?.name}</span>
          {menuOpen ? <X aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          <Menu className="mobile-menu-icon" aria-hidden="true" />
        </button>
      </div>
    </Container>
    {menuOpen && <div className="account-menu" id="account-menu">
      <div className="account-menu__identity"><strong>{user?.name}</strong><span>{user?.email}</span></div>
      <div className="account-menu__mobile-nav">
        <Link to="/app" onClick={() => setMenuOpen(false)}><Home aria-hidden="true" /> Início</Link>
        <Link to="/desejos" onClick={() => setMenuOpen(false)}><Heart aria-hidden="true" /> Desejos</Link>
        <Link to="/alertas" onClick={() => setMenuOpen(false)}><Bell aria-hidden="true" /> Alertas</Link>
      </div>
      <Link className="account-menu__item" to="/perfil" onClick={() => setMenuOpen(false)}><UserRound aria-hidden="true" /> Perfil</Link>
      <Link className="account-menu__item" to="/seguranca" onClick={() => setMenuOpen(false)}><ShieldCheck aria-hidden="true" /> Segurança</Link>
      <Link className="account-menu__item" to="/onboarding?replay=1" onClick={() => setMenuOpen(false)}><CircleHelp aria-hidden="true" /> Como funciona</Link>
      <button className="account-menu__item mobile-theme" type="button" onClick={toggleTheme}>{theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />} Tema {theme === 'light' ? 'escuro' : 'claro'}</button>
      <button className="account-menu__item account-menu__logout" type="button" onClick={leave}><LogOut aria-hidden="true" /> Sair</button>
    </div>}
  </header>;
}
