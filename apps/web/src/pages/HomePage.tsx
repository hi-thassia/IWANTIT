import type { AlertView, WishView } from '@iwantit/shared';
import { BellRing, Camera, ClipboardPaste, Heart, Radar, Search, Sparkles, TrendingDown } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '@/components/layout/AppHeader';
import { Alert, Card, Container, Loading } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const entryPoints = [
  { icon: ClipboardPaste, title: 'Colar link', description: 'Adicione um produto a partir do endereço de uma loja.', to: '/desejos/novo?modo=link' },
  { icon: Search, title: 'Buscar produto', description: 'Cadastre os dados do produto que deseja encontrar.', to: '/desejos/novo' },
  { icon: Camera, title: 'Enviar imagem', description: 'Use uma foto como referência para seu desejo.', to: '/desejos/novo?modo=imagem' },
] as const;

export function HomePage() {
  const { user } = useAuth();
  const [wishes, setWishes] = useState<WishView[]>([]);
  const [alerts, setAlerts] = useState<AlertView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api<{ wishes: WishView[] }>('/api/wishes'), api<{ alerts: AlertView[] }>('/api/alerts')])
      .then(([wishResult, alertResult]) => { setWishes(wishResult.wishes); setAlerts(alertResult.alerts); })
      .catch(() => setError('Não foi possível carregar o resumo agora. Seus dados continuam disponíveis nas páginas de desejos e alertas.'))
      .finally(() => setLoading(false));
  }, []);
  const active = wishes.filter(({ status }) => status === 'active');
  const opportunities = wishes.filter(({ lowestPrice, targetPrice }) => lowestPrice !== null && Number(lowestPrice) <= Number(targetPrice));
  const priced = wishes.filter(({ lowestPrice }) => lowestPrice !== null);
  const firstName = user?.name.trim().split(/\s+/)[0];

  return <main className="dashboard-page"><AppHeader /><Container className="dashboard-content">
    <section className="dashboard-welcome"><p>Olá{firstName ? `, ${firstName}` : ''}</p><h1>O que você quer comprar?</h1><span>Escolha como deseja começar e informe quanto pretende pagar.</span></section>
    <section className="entry-grid" aria-label="Formas de adicionar um desejo">{entryPoints.map(({ icon: Icon, title, description, to }) => <Link className="entry-card" to={to} key={title}><span className="entry-card__icon"><Icon aria-hidden="true" /></span><span className="entry-card__copy"><strong>{title}</strong><small>{description}</small></span></Link>)}</section>
    {error && <Alert variant="warning" title="Resumo temporariamente indisponível">{error}</Alert>}
    {loading ? <Loading label="Carregando seu painel" /> : <>
      <section className="monitoring-summary" aria-labelledby="monitoring-title"><div><span className="monitoring-summary__icon"><Radar aria-hidden="true" /></span><div><h2 id="monitoring-title">Resumo dos monitoramentos</h2><p>{active.length ? `${active.length} desejo(s) ativo(s), ${priced.length} com ofertas e ${opportunities.length} no preço desejado.` : 'Nenhum monitoramento ativo. Seus acompanhamentos aparecerão aqui quando você adicionar um desejo.'}</p></div></div></section>
      <section className="dashboard-grid" aria-label="Visão geral">
        <Summary title="Desejos recentes" icon={<Heart aria-hidden="true" />} empty="Seus desejos mais recentes aparecerão aqui.">{wishes.slice(0, 3).map((wish) => <Link key={wish.id} to={`/desejos/${wish.id}`}><strong>{wish.name}</strong><span>{wish.lowestPrice ? `Menor preço: ${currency(wish.lowestPrice)}` : 'Aguardando ofertas'}</span></Link>)}</Summary>
        <Summary title="Preços encontrados" icon={<TrendingDown aria-hidden="true" />} empty="As ofertas dos seus produtos aparecerão aqui.">{priced.slice(0, 3).map((wish) => <Link key={wish.id} to={`/desejos/${wish.id}`}><strong>{wish.name}</strong><span>{currency(wish.lowestPrice!)}</span></Link>)}</Summary>
        <Summary title="Oportunidades" icon={<Sparkles aria-hidden="true" />} empty="Nenhum produto atingiu seu objetivo ainda.">{opportunities.slice(0, 3).map((wish) => <Link key={wish.id} to={`/desejos/${wish.id}`}><strong>{wish.name}</strong><span>{currency(wish.lowestPrice!)} · objetivo {currency(wish.targetPrice)}</span></Link>)}</Summary>
        <Summary title="Alertas" icon={<BellRing aria-hidden="true" />} empty="Você ainda não tem alertas de preço.">{alerts.slice(0, 3).map((item) => <Link key={item.id} to="/alertas"><strong>{item.title}</strong><span>{item.wishName ?? item.message}</span></Link>)}</Summary>
      </section>
    </>}
  </Container></main>;
}

function Summary({ title, icon, empty, children }: { title: string; icon: ReactNode; empty: string; children: ReactNode }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return <Card className="dashboard-section"><div className="dashboard-section__heading"><span>{icon}</span><h2>{title}</h2></div>{hasItems ? <div className="dashboard-summary-list">{children}</div> : <div className="empty-state"><Sparkles aria-hidden="true" /><p>{empty}</p></div>}</Card>;
}
function currency(value: string) { return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
