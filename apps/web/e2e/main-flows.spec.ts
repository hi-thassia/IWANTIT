import { expect, test, type Page, type Route } from '@playwright/test';

const user = { id: 'user-1', name: 'Ana Souza', email: 'ana@example.com', avatarUrl: null, twoFactorEnabled: false, onboardingCompleted: true, theme: 'light', loginMethods: ['password'] };
const marketplace = { id: '11111111-1111-4111-8111-111111111111', name: 'Mercado Livre', slug: 'mercado-livre' };
const wish = { id: '22222222-2222-4222-8222-222222222222', userId: user.id, name: 'Tênis Runner', referenceUrl: null, referenceImage: null, targetPrice: '450.00', initialPrice: '699.00', category: 'Calçados', brand: 'Acme', color: null, size: '36', notes: null, exactMatchOnly: true, status: 'active', alertType: 'price_target', marketplaceIds: [marketplace.id], marketplaces: [marketplace], lowestPrice: '430.00', lowestMarketplace: 'Mercado Livre', lastUpdatedAt: '2026-08-29T12:00:00Z', offerCount: 1 };

test('cadastro conduz ao onboarding e à Home', async ({ page }) => {
  let current = null as typeof user | null;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/session') return json(route, current ? { user: current } : { message: 'Sessão inválida.' }, current ? 200 : 401);
    if (path === '/api/auth/register') { current = { ...user, onboardingCompleted: false }; return json(route, { user: current }, 201); }
    if (path === '/api/onboarding/complete') { current = user; return json(route, { message: 'Concluído.' }); }
    if (path === '/api/wishes') return json(route, { wishes: [] });
    if (path === '/api/alerts') return json(route, { alerts: [], unreadCount: 0 });
    return json(route, {});
  });
  await page.goto('/criar-conta');
  await page.getByLabel('Nome').fill('Ana Souza'); await page.getByLabel('E-mail').fill('ana@example.com');
  await page.getByLabel('Senha', { exact: true }).fill('Senha1234'); await page.getByLabel('Confirmar senha').fill('Senha1234');
  await page.getByRole('button', { name: 'Criar minha conta' }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.getByRole('button', { name: /Continuar/ }).click(); await page.getByRole('button', { name: /Continuar/ }).click();
  await page.getByRole('button', { name: /Começar agora/ }).click();
  await expect(page.getByRole('heading', { name: /O que você quer comprar/ })).toBeVisible();
});

test('usuário navega por dados próprios, cria desejo e lê alerta', async ({ page }) => {
  let wishes = [wish]; let read = false;
  await authenticatedApi(page, async (path, method) => {
    if (path === '/api/wishes' && method === 'POST') { wishes = [...wishes, { ...wish, id: '33333333-3333-4333-8333-333333333333', name: 'Notebook Pro' }]; return { wish: wishes[1] }; }
    if (path === '/api/wishes') return { wishes };
    if (path === '/api/marketplaces') return { marketplaces: [marketplace] };
    if (path === '/api/alerts') return { unreadCount: read ? 0 : 1, alerts: [{ id: '44444444-4444-4444-8444-444444444444', type: 'price_target', title: 'Preço abaixo do seu objetivo!', message: 'Tênis Runner por R$ 430.', wishId: wish.id, wishName: wish.name, offerId: null, offerUrl: null, metadata: {}, readAt: read ? new Date().toISOString() : null, createdAt: '2026-08-29T12:00:00Z' }] };
    if (path.endsWith('/read')) { read = true; return { alert: {} }; }
    return {};
  });
  await page.goto('/app');
  await expect(page.getByText('1 desejo(s) ativo(s), 1 com ofertas e 1 no preço desejado.')).toBeVisible();
  await page.goto('/desejos/novo');
  await page.getByLabel('Nome do produto').fill('Notebook Pro'); await page.getByLabel('Categoria').fill('Eletrônicos'); await page.getByLabel('Quanto pretende pagar').fill('4000');
  await page.getByLabel('Mercado Livre').check(); await page.getByRole('button', { name: /Salvar desejo/ }).click();
  await expect(page.getByRole('heading', { name: 'Meus desejos' })).toBeVisible();
  await page.goto('/alertas'); await expect(page.getByText('1 alerta(s) não lido(s).')).toBeVisible();
  await page.getByRole('button', { name: /Preço abaixo/ }).click(); await expect(page.getByText('Você está em dia com seus alertas.')).toBeVisible();
});

async function authenticatedApi(page: Page, custom: (path: string, method: string) => Promise<object> | object) {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname; const method = route.request().method();
    if (path === '/api/auth/session') return json(route, { user });
    return json(route, await custom(path, method), method === 'POST' && path === '/api/wishes' ? 201 : 200);
  });
}
function json(route: Route, body: object, status = 200) { return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) }); }
