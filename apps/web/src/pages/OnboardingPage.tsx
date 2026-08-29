import { ArrowLeft, ArrowRight, BellRing, Check, Heart, Moon, Sparkles, Store, Sun, Target, TrendingDown, X } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { api } from '@/lib/api';

const steps = [
  {
    kicker: 'Comece pelo que importa',
    title: 'Um desejo, um objetivo.',
    description: 'Conte o que você quer comprar e defina o valor que faria essa compra valer a pena.',
    items: [
      { icon: Heart, title: 'Adicione um desejo', text: 'Guarde algo que você deseja comprar.' },
      { icon: Target, title: 'Defina seu preço', text: 'Informe quanto você pretende pagar.' },
    ],
  },
  {
    kicker: 'Pesquisa simplificada',
    title: 'A busca acontece por você.',
    description: 'O I Want It organiza as oportunidades para você comparar menos e decidir melhor.',
    items: [
      { icon: Store, title: 'Diferentes lojas', text: 'O sistema procura ofertas em vários marketplaces.' },
      { icon: TrendingDown, title: 'Menor preço em foco', text: 'Você acompanha o melhor valor encontrado.' },
    ],
  },
  {
    kicker: 'No momento certo',
    title: 'A oportunidade chega até você.',
    description: 'Quando uma oferta alcançar seu objetivo, você saberá sem precisar conferir preços o tempo todo.',
    items: [
      { icon: BellRing, title: 'Alertas úteis', text: 'Receba um aviso quando surgir uma boa oportunidade.' },
      { icon: Check, title: 'Pronto para começar', text: 'Seus próximos desejos ficarão organizados em um só lugar.' },
    ],
  },
] as const;

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { refresh } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReplay = searchParams.get('replay') === '1';
  const current = steps[step]!;

  async function finish() {
    setSubmitting(true);
    setError('');
    try {
      await api('/api/onboarding/complete', { method: 'POST' });
      await refresh();
      const requested = (location.state as { from?: string } | null)?.from;
      navigate(requested && requested !== '/onboarding' ? requested : '/app', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir agora. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="onboarding-page">
    <header className="onboarding-topbar">
      <span className="brand"><span className="brand__mark"><Sparkles aria-hidden="true" /></span><span>I Want It</span></span>
      <div className="onboarding-topbar__actions">
        {isReplay && <Button asChild variant="ghost" size="sm"><Link to="/app" aria-label="Fechar apresentação"><X aria-hidden="true" /> Fechar</Link></Button>}
        <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label={`Ativar tema ${theme === 'light' ? 'escuro' : 'claro'}`}>{theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}</Button>
      </div>
    </header>

    <section className="onboarding-shell" aria-live="polite">
      <div className="onboarding-progress" aria-label={`Etapa ${step + 1} de ${steps.length}`}>
        {steps.map((item, index) => <span key={item.title} className={index <= step ? 'is-active' : ''} />)}
      </div>
      <div className="onboarding-copy">
        <span className="section-kicker">{current.kicker}</span>
        <h1>{current.title}</h1>
        <p>{current.description}</p>
      </div>
      <div className="onboarding-features">
        {current.items.map(({ icon: Icon, title, text }) => <article className="onboarding-feature" key={title}>
          <span className="onboarding-feature__icon"><Icon aria-hidden="true" /></span>
          <div><h2>{title}</h2><p>{text}</p></div>
        </article>)}
      </div>
      {error && <p className="onboarding-error" role="alert">{error}</p>}
      <div className="onboarding-actions">
        <Button variant="ghost" onClick={() => setStep((value) => value - 1)} disabled={step === 0 || submitting}><ArrowLeft aria-hidden="true" /> Voltar</Button>
        {step < steps.length - 1
          ? <Button size="lg" onClick={() => setStep((value) => value + 1)}>Continuar <ArrowRight aria-hidden="true" /></Button>
          : <Button size="lg" loading={submitting} onClick={finish}>Começar agora <Check aria-hidden="true" /></Button>}
      </div>
    </section>
  </main>;
}
