# Caloteiros

Aplicativo de controle financeiro para casais. Cada pessoa tem sua planilha pessoal no Google Sheets e ambos compartilham uma planilha de despesas divididas.

## Funcionalidades

- Cadastro de receitas e despesas com categorias em árvore e contas personalizáveis
- Divisão de despesas entre o casal (50/50) com fluxo de confirmação
- Resumos mensais pré-calculados para consulta rápida
- Autocomplete de lançamentos baseado no histórico
- Máscara monetária no campo de valor (R$ 1.234,56)
- Gerenciamento de categorias e contas (criar, editar, desativar, importar via JSON)
- PWA instalável no celular com cache offline via Workbox

## Tecnologia

- React 19 para a interface
- Vite 7 como bundler e dev server
- vite-plugin-pwa para service worker e cache automático
- CSS modular sem frameworks (variáveis, responsivo, dark-ready)
- Google Identity Services para autenticação via redirect OAuth
- Google Sheets API para persistência (sem backend)
- Google Drive API para organização em pasta dedicada

## Estrutura do projeto

```
src/
├── App.jsx                    Composição principal e roteamento
├── main.jsx                   Entry point
├── constants.js               Constantes, storage keys, seeds
├── routes.js                  Rotas hash-based e menu
├── hooks/
│   ├── useAuth.js             Autenticação, token, sessão
│   ├── useTransactions.js     CRUD de lançamentos, filtros, sugestões
│   ├── useCouple.js           Planilha compartilhada do casal
│   ├── useSettings.js         Categorias, contas, mapas de resolução
│   ├── useToast.js            Notificações
│   ├── useConfirm.js          Modal de confirmação
│   └── useRouter.js           Roteamento hash
├── components/
│   ├── Brand.jsx              Logo
│   ├── Sidebar.jsx            Menu lateral / bottom nav
│   ├── DashboardHeader.jsx    Cabeçalho com mês e ações
│   ├── OverviewPage.jsx       Visão geral (cards + tabela)
│   ├── SummaryCards.jsx       Cards de saldo/receitas/despesas
│   ├── TransactionsTable.jsx  Tabela de lançamentos
│   ├── TransactionForm.jsx    Formulário com autocomplete e máscara
│   ├── CategoryChart.jsx      Gráfico de barras por categoria
│   ├── CouplePage.jsx         Página do casal (pendentes/pagos/confirmados)
│   ├── CoupleSetup.jsx        Configuração inicial do casal
│   ├── SettingsRoute.jsx      Wrapper da página de configurações
│   ├── SettingsPage.jsx       Gerenciamento de categorias e contas
│   ├── ConfirmModal.jsx       Modal de confirmação customizado
│   ├── Spinner.jsx            Indicador de carregamento
│   ├── Toast.jsx              Notificação flutuante
│   └── GoogleIcon.jsx         Ícone SVG do Google
├── services/
│   ├── sheetsApi.js           HTTP compartilhado com retry e detecção de 401
│   ├── googleSheets.js        CRUD na planilha pessoal
│   ├── coupleSheets.js        CRUD na planilha do casal
│   ├── settingsSheets.js      CRUD de categorias e contas
│   ├── summaries.js           Aba Resumos (agregações pré-calculadas)
│   ├── driveUtils.js          Pasta CaloteirosApp e busca de arquivos
│   ├── auth.js                Redirect OAuth e extração de token
│   └── migrations.js          Migração automática de planilhas antigas
├── utils/
│   ├── formatters.js          brl(), dateBR(), maskCurrency(), newId()
│   └── resolvers.js           Resolução de IDs para nomes (categorias/contas)
assets/styles/
├── foundation.css             Tokens, reset, utilitários
├── components.css             Botões, painéis, modal, spinner, toast
├── dashboard.css              Layout, cards, tabela, formulário, autocomplete
├── couple.css                 Estilos do painel do casal
├── settings.css               Estilos de configurações
└── responsive.css             Mobile (bottom nav) e tablet
```

## Planilhas no Google Drive

```
Google Drive/
└── CaloteirosApp/
    ├── Caloteiros - Controle Financeiro    (planilha pessoal)
    │   ├── Lancamentos
    │   ├── Resumos
    │   ├── Categorias
    │   ├── Contas
    │   └── Configuracoes
    └── Caloteiros - Casal                  (compartilhada)
        ├── Divisao
        ├── Resumos
        └── Configuracoes
```

## Executar localmente

Requisitos: Node.js 18+

```powershell
npm install
npm run dev
```

Acesse `http://localhost:5173`.

## Configurar Google OAuth

1. No Google Cloud Console, ative as APIs: Google Sheets API e Google Drive API
2. Crie uma credencial OAuth do tipo **Aplicativo da Web**
3. Adicione em **Origens JavaScript autorizadas**: `http://localhost:5173`
4. Adicione em **URIs de redirecionamento autorizados**: `http://localhost:5173/`
5. Crie o arquivo `.env` na raiz:

```
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
```

## Fluxo de autenticação

- Login via redirect OAuth (sem popup, funciona em PWA)
- Token persistido no localStorage com timestamp de expiração (1h)
- F5 restaura a sessão automaticamente se o token ainda for válido
- Token expirado redireciona para o Google automaticamente

## Fluxo do casal

1. Um dos dois cria a planilha do casal (aba "Casal" → "Criar")
2. Compartilha o código com o parceiro(a)
3. Parceiro(a) entra com o código
4. Ao cadastrar um lançamento, marcar "Dividir com parceiro(a)"
5. O lançamento aparece na aba Casal como pendente
6. Parceiro marca "Paguei" → abre formulário de despesa pré-preenchido
7. Criador confirma recebimento → abre formulário de receita (reembolso) pré-preenchido

## Migração de planilhas

O app detecta automaticamente planilhas com estrutura antiga e aplica migrações:
- Cria abas faltantes (Categorias, Contas, Resumos)
- Atualiza cabeçalhos com novas colunas
- Recalcula resumos a partir dos lançamentos existentes
- Dados existentes nunca são removidos

## Build para produção

```powershell
npm run build
```

Gera a pasta `dist/` com HTML, CSS, JS e service worker. Pode ser publicada em qualquer hospedagem estática (Cloudflare Pages, Netlify, GitHub Pages).

Para produção, adicione a URL final nas credenciais OAuth do Google Cloud Console (origens + redirect).
