import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WishesPage } from './WishesPage';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', () => ({ api: apiMock, ApiRequestError: class extends Error {} }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { name: 'Ana', email: 'ana@example.com' }, logout: vi.fn() }) }));
vi.mock('@/contexts/ThemeContext', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
const market = { id: '11111111-1111-4111-8111-111111111111', name: 'Mercado Livre', slug: 'mercado-livre' };
const wish = { id: '22222222-2222-4222-8222-222222222222', name: 'Tênis', referenceUrl: null, referenceImage: null, targetPrice: '350.00', initialPrice: null, category: 'Calçados', brand: null, color: null, size: null, notes: null, exactMatchOnly: true, alertType: 'price_target', status: 'active', marketplaceIds: [market.id], marketplaces: [market], lowestPrice: null, lowestMarketplace: null, lastUpdatedAt: '2026-08-29T12:00:00.000Z', offerCount: 0 };

describe('WishesPage', () => {
  beforeEach(() => apiMock.mockReset().mockImplementation((path: string) => path === '/api/marketplaces' ? Promise.resolve({ marketplaces: [market] }) : Promise.resolve({ wishes: [wish] })));
  afterEach(cleanup);
  it('renders real wishes and the honest pre-search state', async () => { render(<MemoryRouter initialEntries={['/desejos']}><Routes><Route path="/desejos" element={<WishesPage />} /></Routes></MemoryRouter>); expect(await screen.findByText('Tênis')).toBeVisible(); expect(screen.getByText('Aguardando primeira busca')).toBeVisible(); expect(screen.getByText('Ainda não encontrada')).toBeVisible(); });
  it('opens the complete creation form', async () => { render(<MemoryRouter initialEntries={['/desejos/novo']}><Routes><Route path="/desejos/novo" element={<WishesPage />} /></Routes></MemoryRouter>); expect(await screen.findByRole('heading', { name: 'O que você quer acompanhar?' })).toBeVisible(); expect(screen.getByLabelText('Nome do produto')).toBeVisible(); expect(screen.getByText('Mercado Livre')).toBeVisible(); expect(screen.getByText('Aceito produtos semelhantes')).toBeVisible(); });
  it('imports available link data into editable fields', async () => {
    apiMock.mockImplementation((path: string) => path === '/api/marketplaces' ? Promise.resolve({ marketplaces: [market] }) : path === '/api/product-imports' ? Promise.resolve({ product: { marketplace: 'mercado-livre', marketplaceName: 'Mercado Livre', status: 'imported', source: 'official_api', message: 'Revise os dados.', referenceUrl: 'https://produto.mercadolivre.com.br/MLB-1234567890-x', title: 'Tênis importado', imageUrl: null, price: '499.90', brand: 'Marca real', category: 'Calçados', seller: null, color: null, size: null, variations: [], attributes: {} } }) : Promise.resolve({ wishes: [] }));
    render(<MemoryRouter initialEntries={['/desejos/novo?modo=link']}><Routes><Route path="/desejos/novo" element={<WishesPage />} /></Routes></MemoryRouter>);
    const link = await screen.findByLabelText('Link de referência (opcional)');
    fireEvent.change(link, { target: { value: 'https://produto.mercadolivre.com.br/MLB-1234567890-x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Importar dados' }));
    await waitFor(() => expect(screen.getByLabelText('Nome do produto')).toHaveValue('Tênis importado'));
    expect(screen.getByLabelText('Preço atual conhecido (opcional)')).toHaveValue(499.9);
    expect(screen.getByLabelText('Marca (opcional)')).toHaveValue('Marca real');
    expect(screen.getByRole('checkbox', { name: 'Mercado Livre' })).toBeChecked();
    expect(screen.getByText('Dados importados para revisão')).toBeVisible();
  });
  it('shows current price above the objective, offers and historical chart', async () => {
    const monitoredWish = { ...wish, initialPrice: '699.00', lowestPrice: '489.00', lowestMarketplace: 'Mercado Livre', offerCount: 1 };
    const monitoring = { wishId: wish.id, targetPrice: '350.00', initialPrice: '699.00', currentLowestPrice: '489.00', currentLowestMarketplace: 'Mercado Livre', historicalLowestPrice: '489.00', historicalHighestPrice: '599.00', lastCheckedAt: '2026-08-29T12:00:00.000Z', offers: [{ id: 'offer-1', marketplace: 'mercado-livre', marketplaceName: 'Mercado Livre', externalId: 'MLB1', title: 'Tênis', url: 'https://example.com/item', imageUrl: null, seller: 'Loja', price: '489.00', shippingPrice: null, totalPrice: null, effectivePrice: '489.00', availability: 'available', attributes: {}, checkedAt: '2026-08-29T12:00:00.000Z', matchScore: '94.00' }], history: [{ recordedAt: '2026-08-28T12:00:00.000Z', lowestPrice: '599.00' }, { recordedAt: '2026-08-29T12:00:00.000Z', lowestPrice: '489.00' }] };
    apiMock.mockImplementation((path?: string) => path === '/api/marketplaces' ? Promise.resolve({ marketplaces: [market] }) : path?.endsWith('/monitoring') ? Promise.resolve({ monitoring }) : path === `/api/wishes/${wish.id}` ? Promise.resolve({ wish: monitoredWish }) : Promise.resolve({ wishes: [monitoredWish] }));
    render(<MemoryRouter initialEntries={[`/desejos/${wish.id}`]}><Routes><Route path="/desejos/:id" element={<WishesPage />} /></Routes></MemoryRouter>);
    expect(await screen.findByText('Menor preço atual')).toBeVisible(); expect(screen.getAllByText(/489,00/).length).toBeGreaterThan(0); expect(screen.getAllByText(/350,00/).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: 'Evolução do menor preço encontrado' })).toBeVisible(); expect(screen.getByRole('link', { name: 'Tênis' })).toHaveAttribute('href', 'https://example.com/item'); expect(screen.getByText('94%')).toBeVisible();
  });
});
