# PDocSend

Sistema whitelabel multi-tenant para leitura de PDFs imobiliarios e envio automatizado de mensagens personalizadas via WhatsApp. Cada tenant (imobiliaria/corretor) possui seus proprios dados, credenciais de WhatsApp e configuracoes isoladas.

---

## Funcionalidades

### Multi-Tenancy
- Isolamento completo de dados por tenant
- Cada tenant possui suas credenciais Z-API (WhatsApp)
- Template de mensagem customizavel por tenant
- Limite diario de envios configuravel por tenant

### Leitura de PDF
- Upload de PDFs imobiliarios via drag and drop
- Extracao automatica de dados com pdf.js-extract (engine Mozilla)
- Campos extraidos: Proprietario, Telefone, Edificio, Endereco, Numero, Apartamento, Locacao, Venda
- Capitalizacao automatica de nomes
- Mesclagem de entradas duplicadas (locacao + venda separados no PDF)
- Deduplicacao de imoveis dentro do mesmo PDF

### Envio via WhatsApp (Z-API)
- Envio automatizado via Z-API (API REST)
- Mensagens personalizadas com saudacao dinamica (Bom dia/Boa tarde/Boa noite)
- Agrupamento de imoveis por proprietario (1 mensagem para multiplos imoveis)
- Fila de envio via Cloud Tasks (delay de 50s entre mensagens)
- Envio assincrono - Felipe pode fechar o browser
- Cancelamento de lote e cancelamento individual

### Deduplicacao entre PDFs
- Chave unica: telefone + edificio/endereco + numero + apartamento
- Imovel ja enviado = marcado como "Ja enviado" na revisao
- Imovel novo do mesmo proprietario = envia so o novo
- Historico por contato (busca por telefone)

### Tela de Revisao
- Resumo: imoveis no PDF, unicos, contatos, mensagens a enviar, ja enviados
- Edicao inline de nome do contato
- Edicao de mensagem (textarea)
- Preview da mensagem
- Remocao de contato com modal de confirmacao
- Badges de operacao: V (venda), L (locacao), V+L (ambos)

### Painel Admin (Superadmin)
- Gerenciamento de clientes (criar, editar, visualizar)
- Usuarios pendentes com badge de notificacao
- Monitoramento de envios por cliente
- Configuracao de limite diario por tenant
- Configuracao de Z-API por tenant

### Filtro de Operacao
- Seletor na tela de Upload: Todos, Apenas Venda, Apenas Locacao
- Imoveis com "venda e locacao" sao ajustados para a operacao selecionada
- Mensagem enviada respeita o filtro (ex: so menciona "venda" mesmo que tenha locacao)

### Dashboard do Cliente
- Mensagens enviadas hoje / limite diario (com barra de progresso)
- Total enviado no mes
- PDFs processados
- Ultimo envio

### Autenticacao
- Firebase Auth com email/senha
- Controle de acesso por role (superadmin, admin)
- Usuarios sem tenant veem mensagem na tela de login
- Recuperacao de senha por email

---

## Tecnologias

### Backend

| Tecnologia | Versao |
|-----------|--------|
| Node.js | 20+ |
| Express | 4.18.x |
| TypeScript | 5.3.x |
| Firebase Admin SDK | 12.0.x |
| Firebase Functions | 7.0.x (Gen 2) |
| pdf.js-extract | latest (engine Mozilla) |
| @google-cloud/tasks | 5.1.x |
| Jest | 29.7.x |

### Frontend

| Tecnologia | Versao |
|-----------|--------|
| React | 18.2.x |
| TypeScript | 5.3.x |
| Vite | 5.0.x |
| React Router | 6.21.x |
| Styled Components | 6.1.x |
| Axios | 1.6.x |
| Firebase | 10.7.x |
| Lucide React | 0.555.x |
| Jest | 30.2.x |

### Infraestrutura

| Servico | Uso |
|---------|-----|
| Firebase Hosting | Frontend SPA |
| Cloud Functions Gen 2 | Backend API |
| Cloud Firestore | Database |
| Cloud Tasks | Fila de envio de mensagens |
| Firebase Auth | Autenticacao |
| Z-API | Envio de mensagens WhatsApp |
| GitHub Actions | CI/CD |

---

## Estrutura do Projeto

```
imobi-whatsapp/
├── backend/
│   ├── src/
│   │   ├── config/                  # Configuracoes
│   │   │   ├── firebase.ts          # Firebase Admin SDK
│   │   │   ├── zapi.ts              # Z-API config
│   │   │   └── cloudTasks.ts        # Cloud Tasks config
│   │   ├── controllers/             # Controllers HTTP
│   │   │   ├── PdfController.ts     # Upload e processamento de PDF
│   │   │   ├── EnvioController.ts   # Envios, lotes, dashboard
│   │   │   └── AdminController.ts   # Painel admin (superadmin)
│   │   ├── functions/               # Cloud Functions
│   │   │   └── processarEnvio.ts    # Processa 1 envio (acionada por Cloud Task)
│   │   ├── middlewares/
│   │   │   ├── auth.ts              # Autenticacao + tenant resolution
│   │   │   ├── superadmin.ts        # Verificacao de superadmin
│   │   │   ├── errorHandler.ts      # Error handler global
│   │   │   ├── requestId.ts         # Request ID (uuid) em todas as requests
│   │   │   ├── validate.ts          # Validacao Zod
│   │   │   └── upload.ts            # Upload de PDF (Busboy)
│   │   ├── models/
│   │   │   ├── Imovel.ts            # Imovel, Contato, ContatoComStatus
│   │   │   ├── Envio.ts             # Lote, Envio, ImovelEnviado
│   │   │   └── Tenant.ts            # Tenant, User, MensagemTemplate
│   │   ├── routes/
│   │   │   ├── index.ts             # Router principal
│   │   │   ├── healthRoutes.ts      # GET /api/health (status do sistema)
│   │   │   ├── pdfRoutes.ts         # POST /api/pdf/processar
│   │   │   ├── envioRoutes.ts       # Envios, lotes, dashboard, contato
│   │   │   └── adminRoutes.ts       # Admin (superadmin only)
│   │   ├── services/
│   │   │   ├── PdfParserService.ts      # Extracao de texto do PDF
│   │   │   ├── DataCleanerService.ts    # Limpeza, normalizacao, dedup
│   │   │   ├── MessageBuilderService.ts # Montagem de mensagem personalizada
│   │   │   ├── DeduplicacaoService.ts   # Dedup entre PDFs (Firestore)
│   │   │   ├── ZApiService.ts           # Integracao Z-API
│   │   │   └── FilaEnvioService.ts      # Cloud Tasks (fila de envio)
│   │   ├── utils/
│   │   │   ├── logger.ts            # Logger estruturado
│   │   │   ├── errors.ts            # Classes de erro customizadas
│   │   │   ├── responseHelper.ts    # Respostas HTTP padronizadas
│   │   │   ├── phoneUtils.ts        # Normalizacao de telefone + nome
│   │   │   └── textUtils.ts         # Limpeza de valores, saudacao, hash
│   │   ├── __tests__/               # Testes unitarios e integracao
│   │   └── index.ts                 # Express app + Firebase Functions
│   ├── scripts/
│   │   ├── seed-tenant.ts           # Criar tenant + vincular usuario
│   │   ├── seed-superadmin.ts       # Criar superadmin
│   │   ├── ativar-usuario.ts        # Ativar e vincular usuario
│   │   └── criar-pdfs-teste.js      # Gerar PDFs de teste
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── config/firebase.ts       # Firebase client config
│   │   ├── contexts/AuthContext.tsx  # Autenticacao
│   │   ├── hooks/useTenant.ts       # Hook de tenant + role
│   │   ├── components/
│   │   │   ├── ErrorBoundary.tsx     # Error boundary global
│   │   │   └── TenantGuard.tsx      # Guard para usuarios sem tenant
│   │   ├── pages/
│   │   │   ├── Login/               # Login + recuperacao de senha
│   │   │   ├── Register/            # Registro + tela de sucesso
│   │   │   ├── Upload/              # Upload PDF + dashboard + filtro de operacao
│   │   │   ├── Revisao/             # Revisao de contatos antes do envio
│   │   │   ├── Envio/               # Progresso do envio (onSnapshot)
│   │   │   ├── Historico/           # Lista de lotes
│   │   │   ├── HistoricoContato/    # Busca por telefone
│   │   │   └── Admin/               # Painel admin (superadmin)
│   │   ├── services/
│   │   │   └── apiClient.ts         # Axios + interceptor de auth
│   │   ├── styles/
│   │   │   ├── theme.ts             # Tokens de design
│   │   │   └── globalStyles.ts      # Estilos globais
│   │   ├── types/index.ts           # Interfaces TypeScript
│   │   └── __tests__/               # Testes do frontend
│   ├── package.json
│   └── tsconfig.json
├── .github/workflows/ci.yml         # CI/CD (lint, testes, deploy)
├── firebase.json                    # Config Firebase
├── firestore.rules                  # Regras de seguranca
├── docs/
│   └── ARCHITECTURE.md              # Arquitetura detalhada
├── SETUP.md                         # Guia de setup para producao
├── STATUS_PROJETO.md                # Status e roadmap
├── PLANO_PROJETO.md                 # Plano original do projeto
└── README.md
```

---

## Instalacao

### Pre-requisitos

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Conta no Firebase com projeto criado
- Conta na Z-API (https://z-api.io)

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

### Configuracao

1. Criar `.env` no backend:
```env
FB_PROJECT_ID=seu-projeto
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

2. Criar `.env` no frontend:
```env
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-id
VITE_FIREBASE_APP_ID=seu-app-id
```

---

## Executando o Projeto

### Desenvolvimento (com emuladores)

```bash
# Terminal 1 - Emuladores Firebase
firebase emulators:start

# Terminal 2 - Backend
cd backend && npm run dev:emulators

# Terminal 3 - Frontend
cd frontend && npm run dev:emulators
```

### Desenvolvimento (sem emuladores)

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### Deploy

```bash
cd backend && npm run build
cd frontend && npm run build
firebase deploy
```

---

## Testes

### Backend

```bash
cd backend
npm test                    # Rodar testes unitarios (122 testes)
npm run test:watch          # Modo watch
npm run test:coverage       # Com cobertura
npm run test:rules          # Testes de Firestore Rules (requer emulador)
```

### Frontend

```bash
cd frontend
npm test                    # Rodar testes (69 testes)
npm run test:watch          # Modo watch
npm run test:coverage       # Com cobertura
```

### Testes de Firestore Rules

Requer emulador Firestore rodando:
```bash
firebase emulators:start --only firestore
cd backend && npm run test:rules
```

---

## Cobertura de Testes

### Backend (12 suites, 122 testes + 23 testes de rules)

| Area | Testes | Cobertura |
|------|--------|-----------|
| Controllers | 33 | EnvioController, AdminController, PdfController |
| Services | 43 | PdfParser, DataCleaner, MessageBuilder, Deduplicacao, processarEnvio |
| Utils | 32 | phoneUtils, textUtils, responseHelper |
| Integracao | 15 | Fluxo Parse → Clean → Message |
| Firestore Rules | 23 | Isolamento multi-tenant, superadmin, deny writes |
| **Total** | **145** | **88% Statements, 81% Branches** |

### Frontend (6 suites, 69 testes)

| Area | Testes | Cobertura |
|------|--------|-----------|
| Login | 10 | Login, recuperacao, tenant check |
| Register | 5 | Registro, validacao, sucesso |
| Upload | 12 | Upload, drag/drop, erros, dashboard |
| Revisao | 16 | Contatos, edicao, remocao, modal, envio |
| Envio | 14 | Progresso, status, cancelar, finalizado |
| Admin | 12 | Tabs, clientes, pendentes, criar, editar |
| **Total** | **69** | **92% Statements, 74% Branches** |

---

## API Endpoints

### Health Check

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/health` | Status do sistema (Firestore latency) |

### PDF

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/pdf/processar` | Upload e processamento de PDF |

### Envios

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| POST | `/api/envios/confirmar` | Confirmar envio de mensagens |
| GET | `/api/envios/lotes` | Listar lotes de envio |
| GET | `/api/envios/lotes/:id` | Detalhes de um lote |
| POST | `/api/envios/lotes/:id/cancelar` | Cancelar lote inteiro |
| POST | `/api/envios/lotes/:id/envios/:envioId/cancelar` | Cancelar envio individual |
| GET | `/api/envios/contato/:telefone` | Historico por telefone |
| GET | `/api/envios/dashboard` | Metricas do dashboard |

### Admin (superadmin)

| Metodo | Endpoint | Descricao |
|--------|----------|-----------|
| GET | `/api/admin/clientes` | Listar clientes |
| GET | `/api/admin/pendentes` | Usuarios sem tenant |
| POST | `/api/admin/clientes` | Criar novo cliente |
| PUT | `/api/admin/clientes/:id` | Editar cliente |
| GET | `/api/admin/monitoramento` | Monitoramento geral |

---

## Arquitetura

### Backend

```
Route → Middleware (auth) → Controller → Service → Repository (Firestore)
                                            ↓
                                      Cloud Tasks → processarEnvio → Z-API
```

### Frontend

```
Page → Hook (useTenant) → Service (apiClient) → API Backend
         ↓
   Context (AuthContext) → Firebase Auth
         ↓
   Firestore (onSnapshot) → Progresso em tempo real
```

### Firestore

```
tenants/{tenantId}
  ├── lotes/{loteId}
  │   └── envios/{envioId}
  └── imoveis_enviados/{hash}

users/{uid}
```

### Roles

| Role | Acesso |
|------|--------|
| superadmin | Painel admin, todos os tenants |
| admin | Upload, revisao, envio, historico do seu tenant |

---

## Scripts Disponiveis

### Backend

| Script | Comando | Descricao |
|--------|---------|-----------|
| dev | `npm run dev` | Servidor local |
| dev:emulators | `npm run dev:emulators` | Servidor com emuladores |
| build | `npm run build` | Compilar TypeScript |
| lint | `npm run lint` | ESLint |
| test | `npm test` | Testes unitarios |
| test:coverage | `npm run test:coverage` | Testes com cobertura |
| test:rules | `npm run test:rules` | Testes de Firestore Rules (requer emulador) |
| seed:tenant | `npm run seed:tenant` | Criar tenant |
| seed:ativar | `npm run seed:ativar` | Ativar usuario |

### Frontend

| Script | Comando | Descricao |
|--------|---------|-----------|
| dev | `npm run dev` | Servidor local |
| dev:emulators | `npm run dev:emulators` | Com emuladores |
| build | `npm run build` | Build de producao |
| test | `npm test` | Testes |
| test:coverage | `npm run test:coverage` | Com cobertura |

---

## Documentacao Adicional

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Arquitetura, regras, SOLID, escalabilidade e guia de implementacao
- [ANALISE_TECNICA.md](docs/ANALISE_TECNICA.md) - Analise de qualidade, plano de evolucao e status das fases
- [SETUP.md](SETUP.md) - Guia completo de setup para producao


---

## Troubleshooting

### PDF nao extrai dados
O PdfParserService foi construido com base em PDFs do formato imobiliario especifico. PDFs com layout diferente podem nao ser parseados.
**Solucao**: O PdfController retorna mensagem de erro. A tela de revisao permite correcao manual.

### Cloud Tasks nao executa
Verifique se a API Cloud Tasks esta ativada e a fila `envio-whatsapp` existe.
```bash
gcloud tasks queues list --location=southamerica-east1
```

### Z-API nao envia
Verifique se a instancia esta conectada (QR Code escaneado).
```bash
curl -X GET "https://api.z-api.io/instances/SEU_ID/token/SEU_TOKEN/status" -H "Client-Token: SEU_CLIENT_TOKEN"
```

### Usuario nao consegue logar
Verifique se existe documento na collection `users` com o UID do usuario e `tenantId` preenchido.

### Erro de CORS
Verifique se o dominio esta na variavel `ALLOWED_ORIGINS` no `.env` do backend.

---

## Licenca

Projeto privado. Todos os direitos reservados.
