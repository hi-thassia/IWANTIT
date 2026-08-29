# Projeto — Wishlist Inteligente com Monitoramento de Preços

## 1. Visão geral

Este projeto é um aplicativo web de lista de desejos com monitoramento inteligente de preços.

A proposta é permitir que uma pessoa cadastre produtos que deseja comprar e informe quanto pretende pagar. O sistema então acompanha ofertas em múltiplas plataformas, inicialmente:

- Shopee
- Mercado Livre
- SHEIN

O objetivo principal não é monitorar apenas um link específico, mas identificar o produto desejado e procurar anúncios equivalentes em diferentes vendedores, anúncios e plataformas.

O sistema deve continuar encontrando o produto mesmo que o anúncio original seja removido, substituído ou fique indisponível.

O aplicativo deve funcionar como uma combinação de:

- lista de desejos;
- comparador de preços;
- rastreador de preços;
- histórico de preços;
- sistema de alertas;
- painel pessoal de acompanhamento.

---

## 2. Identidade visual

A identidade visual deve utilizar principalmente:

- Branco
- Preto
- Roxo

### Tema claro

O tema claro será o tema principal e deve priorizar o branco.

Sugestão visual:

- fundo principal branco ou quase branco;
- cards brancos;
- textos em preto e cinza escuro;
- roxo para botões, links, elementos ativos, gráficos, indicadores e destaques.

### Tema escuro

O sistema também deve possuir modo escuro.

Sugestão visual:

- fundo preto ou grafite;
- superfícies/cards em cinza muito escuro;
- textos claros;
- roxo mantido como cor principal da identidade.

### Cor principal sugerida

Roxo inicial sugerido:

`#7C3AED`

A tonalidade poderá ser ajustada posteriormente.

### Tokens de design sugeridos

Criar tokens ou variáveis para:

- background
- surface
- text-primary
- text-secondary
- primary-purple
- border
- success
- warning
- danger

O sistema de temas deve utilizar esses tokens para permitir troca consistente entre claro e escuro.

---

## 3. Cadastro e autenticação

O aplicativo deve possuir cadastro e login de usuários.

### Métodos de acesso

Implementar:

- cadastro com nome, e-mail e senha;
- login com e-mail e senha;
- login com Google;
- recuperação de senha;
- autenticação em dois fatores;
- gerenciamento de sessões.

### Proteção contra tentativas de senha

Após 3 tentativas incorretas consecutivas, o sistema não deve bloquear a conta definitivamente.

Deve aplicar uma medida de segurança, como:

- bloqueio temporário;
- aumento progressivo do tempo de espera;
- CAPTCHA/desafio;
- verificação adicional.

O objetivo é impedir ataques de força bruta sem permitir que terceiros bloqueiem a conta de outro usuário propositalmente.

### Segurança de senha

As senhas nunca devem ser armazenadas em texto puro.

Devem ser protegidas com hashing seguro e salt.

Outras boas práticas:

- cookies seguros quando aplicável;
- tokens com expiração;
- proteção contra CSRF quando aplicável;
- validação de entrada;
- proteção contra XSS;
- proteção contra SQL Injection;
- rate limiting;
- logs de segurança;
- confirmação para alterações sensíveis.

---

## 4. Onboarding

Após abrir o aplicativo pela primeira vez, o usuário deve visualizar uma explicação curta sobre o funcionamento.

O onboarding deve ser simples e rápido.

Exemplo de conteúdo:

1. Adicione algo que você deseja comprar.
2. Informe quanto pretende pagar.
3. Nós procuramos ofertas em diferentes lojas.
4. Você acompanha o menor preço encontrado.
5. Receba um alerta quando surgir uma boa oportunidade.

Depois disso, o usuário pode começar a cadastrar seu primeiro desejo.

O onboarding não deve ser excessivamente longo.

---

## 5. Home

A Home deve servir como painel principal do usuário.

Sugestão de destaque:

**O que você quer comprar?**

O usuário poderá:

- colar um link;
- pesquisar pelo nome;
- enviar uma imagem.

A Home também pode mostrar:

- desejos recentes;
- produtos que caíram de preço;
- alertas importantes;
- melhores oportunidades encontradas;
- resumo dos produtos monitorados.

---

## 6. Cadastro de um desejo

O usuário deve poder cadastrar um produto que deseja comprar.

### Campos principais

- nome do produto;
- link de referência, opcional;
- imagem, opcional;
- valor atual, quando conhecido;
- valor que pretende pagar;
- categoria;
- marca, opcional;
- cor, opcional;
- tamanho/numeração, opcional;
- observações, opcional;
- plataformas onde deseja procurar;
- tipo de alerta.

### Plataformas

Inicialmente:

- Shopee
- Mercado Livre
- SHEIN
- Todas

### Tipo de alerta

O usuário deve poder escolher algo como:

- avisar quando atingir o preço desejado;
- avisar quando houver queda relevante de preço;
- avisar quando surgir o menor preço registrado.

### Produto exato ou semelhante

Adicionar uma preferência:

- Quero somente este produto exato
- Aceito produtos semelhantes

Isso deve afetar o motor de correspondência entre anúncios.

---

## 7. Entrada por link

O link deverá ser uma das formas principais de cadastrar um desejo.

Ao colar um link de uma loja suportada, o sistema deverá tentar extrair automaticamente:

- nome do produto;
- preço atual;
- imagem;
- marca;
- categoria;
- vendedor quando disponível;
- variações;
- cor;
- tamanho;
- outros atributos relevantes.

O usuário então confirma os dados e informa principalmente quanto deseja pagar.

Importante:

O link é apenas uma referência inicial.

O sistema não deve monitorar somente aquele anúncio.

A partir dos dados obtidos, deve criar uma representação interna do produto e procurar ofertas equivalentes em outros anúncios e plataformas.

---

## 8. Entrada por imagem

O usuário também deve poder adicionar uma imagem ao cadastrar o desejo.

A imagem é opcional.

Ela pode ser:

- enviada pelo próprio usuário;
- obtida automaticamente do link;
- definida posteriormente.

No MVP, a imagem pode ser utilizada inicialmente como elemento visual e dado auxiliar.

Busca avançada por similaridade visual poderá ser evoluída em versões posteriores.

---

## 9. Modelo interno de produto

O sistema deve diferenciar:

### Produto desejado

Representa aquilo que o usuário realmente quer comprar.

Exemplo:

- Adidas Samba OG
- branco
- tamanho 36

### Oferta/anúncio

Representa uma oferta encontrada em determinado marketplace.

Um mesmo produto desejado pode possuir diversas ofertas.

Exemplo:

Produto desejado:

`Adidas Samba OG branco — tamanho 36`

Ofertas:

- Shopee — anúncio 1 — R$ 489
- Shopee — anúncio 2 — R$ 519
- Mercado Livre — anúncio 3 — R$ 495

---

## 10. Motor de correspondência de produtos

O sistema deverá determinar se uma oferta encontrada corresponde ao produto desejado.

Pode analisar:

- nome;
- título do anúncio;
- marca;
- modelo;
- categoria;
- descrição;
- cor;
- tamanho;
- capacidade;
- variação;
- SKU/identificadores quando disponíveis;
- imagem;
- atributos técnicos.

O motor poderá produzir um índice de confiança.

Exemplo:

`94% de chance de ser o mesmo produto`

### Regras de variantes

O sistema deve evitar equivalências incorretas.

Exemplos:

- tênis tamanho 38 não deve ser tratado automaticamente como equivalente ao tamanho 36;
- camiseta P não deve ser equivalente à G;
- celular de 128 GB não deve ser equivalente ao de 256 GB;
- cores diferentes podem ser relevantes dependendo da escolha do usuário.

---

## 11. Busca e monitoramento de ofertas

O sistema deverá periodicamente consultar as fontes disponíveis e procurar ofertas.

A arquitetura deve permitir adicionar novos marketplaces no futuro.

O sistema deverá armazenar:

- plataforma;
- anúncio;
- vendedor, quando disponível;
- URL;
- preço;
- frete quando disponível;
- preço total quando aplicável;
- disponibilidade;
- data/hora da coleta;
- confiança de correspondência.

A consulta deve respeitar APIs oficiais, limites de uso, termos das plataformas e restrições técnicas aplicáveis.

---

## 12. Histórico de preços

Cada oferta encontrada deve alimentar o histórico de preços.

O sistema deve permitir identificar:

- preço atual;
- menor preço encontrado;
- maior preço encontrado;
- preço inicial;
- evolução do preço;
- menor preço em determinado período;
- data da última verificação.

O usuário pode visualizar um gráfico de histórico.

Exemplo:

`R$ 699 inicial → R$ 489 menor atual → R$ 450 objetivo`

Mesmo que o valor encontrado ainda não seja o valor desejado pelo usuário, o sistema deve mostrar o menor preço encontrado.

---

## 13. Alertas

O sistema deverá gerar alertas quando condições configuradas forem atendidas.

Exemplos:

- preço atingiu o objetivo;
- preço ficou abaixo do objetivo;
- nova menor oferta encontrada;
- queda percentual relevante;
- produto voltou ao estoque.

Exemplo de alerta:

**Seu desejo ficou mais barato!**

Adidas Samba OG

De R$ 699 para R$ 479.

Menor preço encontrado nos últimos 30 dias.

Shopee.

Os canais de notificação poderão começar com notificações dentro da aplicação e serem expandidos no futuro.

---

## 14. Perfil do usuário

Cada usuário deve possuir um perfil.

### Informações e configurações

O perfil poderá permitir:

- adicionar foto de perfil;
- alterar foto;
- editar nome;
- alterar e-mail;
- alterar senha;
- gerenciar autenticação em dois fatores;
- visualizar login com Google;
- gerenciar sessões;
- configurar notificações;
- trocar entre tema claro e escuro.

A foto de perfil é opcional.

---

## 15. Área "Meus desejos"

O perfil e/ou dashboard deve exibir os produtos cadastrados pelo usuário.

Cada card pode mostrar:

- imagem;
- nome;
- valor desejado;
- menor preço encontrado;
- plataforma da melhor oferta;
- preço anterior;
- status do monitoramento;
- última atualização.

Exemplo:

**Adidas Samba OG**

Quero pagar: R$ 450

Menor preço encontrado: R$ 489

Mercado Livre

Status: Buscando ofertas

Última busca: há 12 minutos

### Tela de detalhes

Ao abrir um desejo, mostrar:

- imagem;
- nome;
- características;
- preço desejado;
- menor preço atual;
- melhor preço já registrado;
- histórico de preços;
- ofertas encontradas;
- plataforma;
- vendedor;
- data da última consulta;
- status;
- gráfico;
- editar desejo;
- pausar monitoramento;
- remover desejo.

---

# Arquitetura funcional

O sistema pode ser dividido conceitualmente nos seguintes módulos:

1. Interface web
2. Autenticação
3. Gestão de usuários
4. Perfil
5. Gestão de desejos
6. Importação de produto por link
7. Upload de imagens
8. Catálogo interno
9. Integrações com marketplaces
10. Motor de correspondência
11. Monitor de preços
12. Histórico
13. Alertas
14. Preferências
15. Segurança e auditoria

---

# Entidades principais do banco de dados

## User

Possíveis campos:

- id
- name
- email
- password_hash
- google_id
- avatar_url
- two_factor_enabled
- theme
- created_at
- updated_at

## Wish

Possíveis campos:

- id
- user_id
- name
- reference_url
- reference_image
- target_price
- initial_price
- category
- brand
- color
- size
- notes
- exact_match_only
- status
- created_at
- updated_at

## Marketplace

- id
- name
- slug
- enabled

## Offer

- id
- wish_id
- marketplace_id
- external_id
- title
- url
- image
- seller
- price
- shipping_price
- total_price
- availability
- match_score
- checked_at

## PriceHistory

- id
- offer_id
- price
- shipping_price
- total_price
- recorded_at

## Alert

- id
- user_id
- wish_id
- type
- message
- read
- created_at

## NotificationPreference

- id
- user_id
- price_target_alert
- price_drop_alert
- new_low_alert
- stock_alert

## LoginAttempt

- id
- user_id/email
- ip
- successful
- created_at

## Session

- id
- user_id
- device
- ip
- expires_at
- created_at

---

# Fluxo principal do usuário

1. Usuário entra no aplicativo.
2. Visualiza onboarding quando necessário.
3. Cria conta ou entra.
4. Pode utilizar Google para login.
5. Configura 2FA quando aplicável.
6. Acessa a Home.
7. Adiciona um desejo.
8. Pode colar um link, buscar por nome ou adicionar imagem.
9. Sistema identifica o produto.
10. Usuário informa o preço desejado.
11. Usuário define variações importantes.
12. Usuário escolhe onde procurar.
13. Desejo é salvo.
14. Sistema começa a procurar ofertas.
15. Ofertas são comparadas.
16. O menor preço encontrado é atualizado.
17. Histórico de preços é armazenado.
18. Dashboard/perfil mostra o andamento.
19. Quando alguma condição de alerta é atingida, o usuário é notificado.

---

# Roadmap de implementação — 15 partes

## Parte 1 — Fundação do projeto e Design System

Objetivo:

- iniciar estrutura frontend/backend;
- definir organização de pastas;
- configurar ambiente;
- criar tokens de design;
- implementar tema claro e escuro;
- criar componentes básicos;
- configurar layout responsivo.

Entrega esperada:

Aplicação base funcionando com identidade branco, preto e roxo.

---

## Parte 2 — Banco de dados e modelos principais

Objetivo:

Criar estrutura inicial do banco e entidades:

- User
- Wish
- Marketplace
- Offer
- PriceHistory
- Alert
- NotificationPreference
- LoginAttempt
- Session

Entrega esperada:

Banco estruturado, migrations e camada de acesso aos dados.

---

## Parte 3 — Cadastro, login e sessões

Objetivo:

Implementar:

- cadastro;
- login;
- logout;
- validação de e-mail;
- sessões;
- recuperação de senha;
- hashing seguro.

Entrega esperada:

Fluxo completo de autenticação tradicional.

---

## Parte 4 — Segurança avançada

Objetivo:

Implementar:

- autenticação em dois fatores;
- limite de tentativas;
- bloqueio temporário;
- rate limiting;
- proteção de endpoints;
- validação;
- logs;
- gerenciamento de sessões.

Entrega esperada:

Camada de segurança preparada para ambiente real.

---

## Parte 5 — Login com Google

Objetivo:

Implementar OAuth/Login com Google e integração com usuários existentes.

Entrega esperada:

Botão "Continuar com Google" funcionando.

---

## Parte 6 — Onboarding

Objetivo:

Criar apresentação inicial curta explicando:

- adicionar desejo;
- informar preço;
- monitoramento;
- comparação;
- alertas.

Entrega esperada:

Onboarding completo e persistência de "já visualizado".

---

## Parte 7 — Home e navegação

Objetivo:

Criar:

- Home;
- menu;
- header;
- navegação;
- atalhos;
- estados vazios;
- resumo de desejos;
- seção de oportunidades.

Entrega esperada:

Dashboard navegável e responsivo.

---

## Parte 8 — Perfil e configurações

Objetivo:

Implementar:

- foto;
- nome;
- e-mail;
- senha;
- 2FA;
- tema;
- notificações;
- gerenciamento básico da conta.

Entrega esperada:

Perfil funcional.

---

## Parte 9 — Cadastro e gerenciamento de desejos

Objetivo:

Criar:

- formulário de desejo;
- imagem;
- nome;
- link;
- preço desejado;
- categoria;
- marca;
- tamanho;
- cor;
- observações;
- plataformas;
- produto exato/semelhante.

Também:

- editar;
- pausar;
- excluir.

Entrega esperada:

CRUD completo de desejos.

---

## Parte 10 — Importação inteligente por link

Objetivo:

Ao colar URL suportada:

- validar marketplace;
- extrair dados disponíveis;
- preencher formulário;
- obter título;
- imagem;
- preço;
- atributos.

Entrega esperada:

Cadastro rápido por link.

---

## Parte 11 — Integrações de busca por marketplace

Objetivo:

Criar arquitetura de conectores/adapters.

Começar com:

- Mercado Livre
- Shopee
- SHEIN

Cada integração deve retornar dados em um formato interno comum.

Entrega esperada:

Sistema capaz de obter ofertas de múltiplas fontes.

---

## Parte 12 — Motor de correspondência de produtos

Objetivo:

Determinar se anúncios encontrados representam o produto desejado.

Utilizar:

- título;
- marca;
- modelo;
- tamanho;
- cor;
- categoria;
- atributos;
- imagem quando aplicável.

Gerar score de compatibilidade.

Entrega esperada:

Correspondência confiável e proteção contra variantes incorretas.

---

## Parte 13 — Monitoramento e histórico de preços

Objetivo:

Criar rotina de verificação.

Implementar:

- coleta periódica;
- atualização das ofertas;
- armazenamento de histórico;
- menor preço atual;
- menor preço histórico;
- última consulta;
- gráfico.

Entrega esperada:

Monitoramento de preços funcionando.

---

## Parte 14 — Alertas e notificações

Objetivo:

Criar regras:

- atingiu preço desejado;
- novo menor preço;
- queda relevante;
- estoque disponível.

Criar central de notificações.

Entrega esperada:

Usuário recebe alertas quando condições forem satisfeitas.

---

## Parte 15 — Polimento, testes e preparação para produção

Objetivo:

- testes unitários;
- testes de integração;
- testes E2E;
- testes de segurança;
- tratamento de erros;
- loading states;
- empty states;
- acessibilidade;
- SEO onde aplicável;
- performance;
- responsividade;
- auditoria visual;
- monitoramento;
- logs;
- documentação;
- variáveis de ambiente;
- build de produção.

Entrega esperada:

Primeira versão do produto pronta para implantação.

---

# Regra de trabalho para cada parte

Antes de implementar qualquer uma das 15 partes:

1. Ler este arquivo `projeto.md` integralmente.
2. Identificar qual parte está sendo executada.
3. Não implementar etapas futuras sem necessidade.
4. Respeitar decisões arquiteturais já existentes.
5. Não remover funcionalidades concluídas anteriormente.
6. Garantir compatibilidade com as partes anteriores.
7. Atualizar documentação quando alguma decisão estrutural mudar.
8. Testar o que foi implementado antes de considerar a parte concluída.
9. Evitar dados mockados quando a etapa já exigir integração real.
10. Não alterar identidade visual sem solicitação.

---

# Critérios gerais de qualidade

O projeto deve priorizar:

- segurança;
- simplicidade;
- boa experiência;
- responsividade;
- acessibilidade;
- performance;
- arquitetura modular;
- escalabilidade;
- manutenção;
- consistência visual.

---

# Escopo inicial do MVP

Para a primeira versão, priorizar:

- autenticação;
- Google Login;
- 2FA;
- perfil;
- tema claro/escuro;
- cadastro de desejo;
- entrada por link;
- imagem;
- preço desejado;
- múltiplas plataformas;
- comparação de ofertas;
- menor preço encontrado;
- histórico;
- alertas;
- dashboard.

Recursos mais avançados de inteligência visual podem ser evoluídos posteriormente.

---

# Princípio central do produto

O sistema não é um simples monitor de links.

Ele deve representar o desejo do usuário como um produto independente e procurar ofertas equivalentes.

O anúncio original é apenas uma referência.

A função principal é responder continuamente à pergunta:

**"Qual é o menor preço disponível agora para o produto que este usuário quer comprar?"**

E, quando fizer sentido:

**"Este preço já atingiu o valor que o usuário deseja pagar?"**

---

# Estado esperado da experiência

O usuário deve sentir que:

- cadastrou o produto uma única vez;
- não precisa ficar pesquisando em várias lojas;
- consegue acompanhar a evolução dos preços;
- sempre vê a melhor oferta encontrada;
- será avisado quando surgir uma oportunidade relevante.

Essa experiência é o núcleo do produto.
