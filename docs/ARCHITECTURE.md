# Arquitetura - PDocSend

> Documento de referencia para manter consistencia em novas implementacoes.
> Ultima atualizacao: 02/04/2026

---

## Visao Geral

```
Frontend (React + TypeScript)              Backend (Express + TypeScript)

Upload → Revisao → Envio                   Route → Validate (Zod) → Controller → Service → Repository → Firestore
    ↓                                           ↓
apiClient (Axios)  ──── REST API ────►    Auth Middleware (JWT + tenant) + Rate Limiting
    ↓                                           ↓
React Query (cache) + onSnapshot ◄────   Cloud Tasks → processarEnvio → Z-API
```

### Stack

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|-----------------|
| Frontend | React 18 + TypeScript | Interface do usuario |
| Estilizacao | Styled Components | CSS-in-JS com tema |
| Roteamento | React Router 6 | Navegacao SPA |
| HTTP Client | Axios | Comunicacao com backend |
| Cache/Estado servidor | React Query | Cache, retry, invalidacao |
| Realtime | Firestore onSnapshot | Progresso de envio |
| Backend | Express + TypeScript | API REST |
| Validacao | Zod | Validacao de entrada nas rotas |
| Rate Limiting | express-rate-limit | 100 req/min global, 10/min upload |
| Cloud Functions | Firebase Gen 2 | Hosting do backend |
| Fila | Google Cloud Tasks | Envio assincrono |
| WhatsApp | Z-API | Envio de mensagens |
| Database | Cloud Firestore | Persistencia |
| Auth | Firebase Auth | Autenticacao |
| CI/CD | GitHub Actions | Lint, testes, deploy |

---

## Camadas do Backend

```
Route → Validate (Zod) → Controller → Service → Repository → Firestore
```

| Camada | Responsabilidade | Exemplo |
|--------|-----------------|---------|
| Route | Definir endpoints + aplicar middlewares | `envioRoutes.ts` |
| Schema (Zod) | Validar body, params e query | `envioSchemas.ts` |
| Controller | Orquestrar services e retornar resposta HTTP | `EnvioController.ts` |
| Service | Logica de negocio | `MessageBuilderService.ts` |
| Repository | Acesso ao Firestore (CRUD) | `LoteRepository.ts` |

### Repositories

| Repository | Colecao Firestore |
|-----------|------------------|
| `TenantRepository` | `tenants/{id}` |
| `UserRepository` | `users/{uid}` |
| `LoteRepository` | `tenants/{id}/lotes/{id}` |
| `EnvioRepository` | `tenants/{id}/lotes/{id}/envios/{id}` |
| `ImovelEnviadoRepository` | `tenants/{id}/imoveis_enviados/{hash}` |

## Camadas do Frontend

### Componentes UI reutilizaveis (`components/ui/`)

| Componente | Uso |
|-----------|-----|
| `ErrorAlert` | Caixa de erro vermelha com icone |
| `SuccessAlert` | Caixa de sucesso verde |
| `LoadingOverlay` | Overlay fullscreen com spinner |
| `LoadingState` | Estado de carregamento centralizado |
| `PageHeader` | Header com botao voltar e titulo |
| `Modal` | Modal com overlay, titulo, acoes |
| `EmptyState` | Estado vazio com mensagem |
| `StatusBadge` | Badge colorido por status |
| `ProgressBar` | Barra de progresso |

### Custom Hooks

| Hook | Responsabilidade |
|------|-----------------|
| `useTenant` | Dados do tenant e role (onSnapshot) |
| `useDashboard` | Metricas do dashboard (React Query) |
| `useFileUpload` | Drag-drop, validacao e ref do file input |
| `useLoteProgress` | Listeners realtime do lote + envios (onSnapshot) |
| `useAdminData` | Dados do painel admin (React Query) |

### React Query

Usado para dados request-response (nao realtime):
- `staleTime: 30s` - dados considerados frescos por 30 segundos
- `retry: 2` - tenta 2x em caso de falha
- Invalidacao automatica apos mutacoes (confirmar envio → invalida dashboard e lotes)
- **Nao usado** para onSnapshot (lote em progresso, useTenant) - esses continuam realtime

---

## Fluxo Principal

### 1. Upload e Processamento do PDF

```
[Frontend]                              [Backend]
Upload PDF ──POST /api/pdf/processar──► PdfController.processar()
                                            │
                                            ├── PdfParserService.extrairDoPdf(buffer)
                                            │       └── pdf.js-extract → texto
                                            │       └── parseTexto() → ImovelBruto[]
                                            │
                                            ├── DataCleanerService.processar(brutos)
                                            │       ├── limparImovel() → normalizar nome, telefone, valores
                                            │       ├── deduplicarImoveis() → mesclar loc+venda
                                            │       └── agruparPorTelefone() → Contato[]
                                            │
                                            ├── DeduplicacaoService.verificar(tenantId, contatos)
                                            │       └── consulta imoveis_enviados → marca novos/ja_enviados
                                            │
                                            └── MessageBuilderService.montarMensagemPreview()
                                                    └── retorna contatos com preview
```

### 2. Confirmacao e Envio

```
[Frontend]                              [Backend]
Confirmar envio ──POST /api/envios/confirmar──► EnvioController.confirmar()
                                                    │
                                                    ├── Verifica rate limiting (limite diario)
                                                    ├── Cria lote no Firestore
                                                    ├── Cria documentos de envio
                                                    └── FilaEnvioService.criarTasks()
                                                            │
                                                            └── Cloud Tasks (1 task por contato)
                                                                    │ delay incremental (50s)
                                                                    ▼
                                                            processarEnvio (Cloud Function)
                                                                    │
                                                                    ├── Verifica idempotencia
                                                                    ├── Verifica se lote cancelado
                                                                    ├── MessageBuilder.montarMensagem()
                                                                    ├── ZApiService.enviarMensagem()
                                                                    ├── Atualiza status no Firestore
                                                                    └── DeduplicacaoService.registrarEnviados()
```

### 3. Progresso em Tempo Real

```
[Frontend]                              [Firestore]
Envio page                              tenants/{tenantId}/lotes/{loteId}
    │                                       │
    └── onSnapshot(loteRef) ◄───────── { status, enviados, erros }
    └── onSnapshot(enviosRef) ◄──────── envios/{envioId} { status }
```

---

## Como adicionar um novo formato de PDF

O PdfParserService esta preparado para o formato imobiliario do `campo belo 10.02.pdf`. Para suportar novos formatos:

### Passo 1 — Analisar o PDF

```typescript
// Extrair texto bruto para entender a estrutura
const { PDFExtract } = require("pdf.js-extract");
const pdfExtract = new PDFExtract();
const data = await pdfExtract.extractBuffer(buffer, {});
const text = data.pages[0].content.map(item => item.str).join(" ");
console.log(text);
```

### Passo 2 — Identificar padroes

Procure:
- **Separador de blocos**: no formato atual e `Informações do imóvel`
- **Campos**: regex para cada campo (Proprietario, Telefone, Edificio, etc.)
- **Valores monetarios**: formato de R$ (pode ter R$R$ duplicado)

### Passo 3 — Criar ou adaptar o parser

```typescript
// backend/src/services/PdfParserService.ts

private extrairBloco(bloco: string): ImovelBruto | null {
  // Proprietario e Telefone sao obrigatorios
  const propMatch = bloco.match(
    /Proprietário\s+(.+?)\s+Telefone\s+([\d\s+]+)\s+E-mail/
  );
  if (!propMatch) return null;

  // Adapte as regex para o novo formato
  // ...
}
```

> **Regra**: Sempre mantenha a interface `ImovelBruto` com os mesmos campos. O `DataCleanerService` nao precisa mudar.

---

## Modelo de Dados (Firestore)

### tenants/{tenantId}

```typescript
{
  nome: string;                    // "Grupo Imobi"
  zapiInstanceId: string;          // ID da instancia Z-API
  zapiToken: string;               // Token da instancia
  zapiClientToken: string;         // Client Token de seguranca
  limiteDiario: number;            // 200 (default)
  mensagemTemplate: {
    nomeCorretor: string;          // "Felipe Dias"
    nomeEmpresa: string;           // "grupo Imobi"
    cargo: string;                 // "corretor"
  };
  criadoEm: Timestamp;
}
```

### tenants/{tenantId}/lotes/{loteId}

```typescript
{
  totalEnvios: number;
  enviados: number;
  erros: number;
  status: "em_andamento" | "finalizado" | "cancelado";
  pdfOrigem: string;               // nome do arquivo PDF
  criadoPor: string;               // UID do usuario
  criadoEm: Timestamp;
  finalizadoEm: Timestamp | null;
}
```

### tenants/{tenantId}/lotes/{loteId}/envios/{envioId}

```typescript
{
  telefone: string;                // "5511990018181"
  nome: string;                    // "Denise"
  nomeContato: string;             // "Denise - Landing Home (Apt 303)"
  imoveis: Imovel[];               // lista de imoveis
  mensagem: string;                // mensagem enviada
  status: "pendente" | "enviando" | "enviado" | "erro" | "cancelado";
  erro: string;
  enviadoEm: Timestamp | null;
  criadoEm: Timestamp;
}
```

### tenants/{tenantId}/imoveis_enviados/{hash}

```typescript
{
  telefone: string;
  edificio: string;
  endereco: string;
  numero: string;
  apartamento: string;
  loteId: string;
  envioId: string;
  enviadoEm: Timestamp;
}
```

> **Hash**: gerado por `gerarHashImovel(telefone, edificio, endereco, numero, apartamento)` em `textUtils.ts`

### users/{uid}

```typescript
{
  email: string;
  nome: string;
  tenantId: string;                // "" para superadmin
  role: "superadmin" | "admin";
  criadoEm: Timestamp;
}
```

---

## Padroes e Convencoes

### Nomenclatura

| Tipo | Padrao | Exemplo |
|------|--------|---------|
| Service | PascalCase + Service | `PdfParserService` |
| Controller | PascalCase + Controller | `EnvioController` |
| Hook | camelCase com use | `useTenant` |
| Rota | kebab-case | `/api/envios/lotes/:id/cancelar` |
| Modelo | PascalCase | `Imovel`, `Contato` |
| Util | camelCase | `normalizarTelefone` |
| Styled Component | PascalCase | `ContatoCard`, `DashCard` |

### Respostas da API

```typescript
// Sucesso
{
  success: true,
  data: T,
  message?: string
}

// Erro
{
  success: false,
  error: string
}
```

### Status HTTP

| Codigo | Uso |
|--------|-----|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Erro de validacao / Bad request |
| 401 | Nao autenticado |
| 403 | Sem permissao |
| 404 | Nao encontrado |
| 500 | Erro interno |

### Autenticacao

Todas as rotas (exceto `/health`) requerem:

```
Authorization: Bearer {firebase-id-token}
```

O middleware `requireAuth` extrai o `tenantId` do Firestore e adiciona ao `req.user`:

```typescript
interface AuthRequest {
  user: {
    uid: string;
    email: string;
    tenantId: string;
    role: string;      // "superadmin" | "admin"
  };
}
```

Rotas admin requerem adicionalmente o middleware `requireSuperAdmin`.

### Rate Limiting

Verificado no `EnvioController.confirmar`:
- Conta lotes criados hoje para o tenant
- Soma `totalEnvios` de cada lote
- Se excede `limiteDiario` do tenant → rejeita com 400

### Deduplicacao

Chave unica de imovel:

```
telefone + (edificio || endereco) + numero + apartamento
```

Normalizado para lowercase, espacos viram `-`.

Verificada em dois momentos:
1. **Dentro do PDF**: `DataCleanerService.deduplicarImoveis()` - mescla entradas duplicadas
2. **Entre PDFs**: `DeduplicacaoService.verificar()` - consulta `imoveis_enviados` no Firestore

### Cloud Tasks

- Fila: `envio-whatsapp` em `southamerica-east1`
- 1 task por mensagem com delay incremental (50s entre cada)
- OIDC token para autenticar na Cloud Function
- Max 3 retries com backoff

### Mensagem Personalizada por Tenant

Cada tenant pode ter um template customizado via campo `textoPersonalizado` no `mensagemTemplate`. Se vazio, usa o template padrao.

Variaveis disponiveis no template:
- `{saudacao}` - Bom dia/Boa tarde/Boa noite (dinamico)
- `{nome}` - Nome do proprietario
- `{nomeCorretor}` - Nome do corretor
- `{nomeEmpresa}` - Nome da empresa
- `{cargo}` - Cargo do corretor
- `{operacao}` - Texto da operacao (ex: "a venda do seu imovel no Landing Home")

Template padrao:
```
{saudacao} {nome}, tudo bem?
Sou o {nomeCorretor}, {cargo} do {nomeEmpresa}. Estou entrando em contato para saber se voce tem interesse em conversarmos sobre {operacao}.

Fico a disposicao!
```

### Preview Editavel

O corretor pode editar a mensagem na tela de Revisao antes de confirmar o envio:
1. Clica no icone do olho para ver o preview
2. Edita o texto diretamente no textarea
3. Ao confirmar, a mensagem editada e salva e enviada
4. O `{saudacao}` e substituido pela saudacao real no momento do envio

### Saudacao Dinamica

Calculada no momento do envio (fuso Brasilia):
- Antes das 12h → "Bom dia"
- 12h-18h → "Boa tarde"
- Apos 18h → "Boa noite"

### Filtro de Operacao

O corretor pode filtrar imoveis por tipo de operacao na tela de Upload:

| Filtro | Comportamento |
|--------|-------------|
| Todos | Inclui todos os imoveis com operacao |
| Apenas Venda | Inclui venda e "venda e locacao" (ajustando para so venda) |
| Apenas Locacao | Inclui locacao e "venda e locacao" (ajustando para so locacao) |

Implementado no `PdfController.processar()`:
- Recebe `filtroOperacao` via FormData
- Filtra imoveis apos o `DataCleanerService.processar()`
- Ajusta a operacao de "venda e locacao" para a operacao filtrada
- Remove valores monetarios da operacao nao selecionada
- A mensagem gerada reflete apenas a operacao filtrada

---

## Estrutura de Testes

### Backend (122 testes, 12 suites)

```
src/__tests__/
├── controllers/
│   ├── EnvioController.test.ts      # Confirmar, cancelar, listar, historico
│   ├── AdminController.test.ts      # Clientes, pendentes, criar, editar, monitoramento
│   └── PdfController.test.ts        # Upload, parsing, filtros, erros
├── services/
│   ├── PdfParserService.test.ts     # Parsing de texto simulado
│   ├── DataCleanerService.test.ts   # Limpeza, dedup, agrupamento, mesclagem
│   ├── MessageBuilderService.test.ts # Montagem de mensagens
│   ├── DeduplicacaoService.test.ts  # Verificacao e registro
│   └── processarEnvio.test.ts       # Idempotencia, cancelamento, envio
├── integration/
│   └── parseFlow.test.ts            # Fluxo Parse → Clean → Message
├── utils/
│   ├── phoneUtils.test.ts           # Normalizacao, extracao de nome
│   ├── textUtils.test.ts            # Valores, hash, saudacao
│   └── responseHelper.test.ts       # Respostas HTTP
└── mocks/
    └── firestore.ts                 # Mock do Firestore
```

### Frontend (69 testes, 6 suites)

```
src/__tests__/
├── pages/
│   ├── Login.test.tsx               # Login, recuperacao, tenant check
│   ├── Register.test.tsx            # Registro, validacao, sucesso
│   ├── Upload.test.tsx              # Upload, drag/drop, erros, loading
│   ├── Revisao.test.tsx             # Contatos, edicao, remocao, modal, envio
│   ├── Envio.test.tsx               # Progresso, status, cancelar, finalizado
│   └── Admin.test.tsx               # Tabs, clientes, pendentes, criar, editar
├── setup.ts                         # Jest DOM setup
└── testUtils.tsx                    # Providers para testes (React Query + Theme + Router)
```

---

## CI/CD

### Pipeline (`.github/workflows/ci.yml`)

```
Push para main
    │
    ├── Backend Job
    │   ├── npm ci
    │   ├── lint (eslint)
    │   ├── tsc --noEmit
    │   └── jest --ci --coverage
    │
    ├── Frontend Job
    │   ├── npm ci
    │   ├── tsc --noEmit
    │   ├── jest --ci --coverage
    │   └── npm run build
    │
    └── Deploy Job (se backend + frontend passaram)
        ├── Build backend + frontend
        └── firebase deploy
```

### Secrets necessarios

| Secret | Descricao |
|--------|-----------|
| `VITE_FIREBASE_*` | Configuracoes do Firebase para build |
| `FIREBASE_SERVICE_ACCOUNT` | JSON da service account para deploy |

---

## Regras e Boas Praticas

> Referencia obrigatoria para qualquer alteracao no codigo.
> Antes de criar um arquivo, componente, rota ou service, leia esta secao.

---

### Regras Gerais

#### DEVE fazer (obrigatorio)

- Usar TypeScript strict mode. Nunca desativar no tsconfig.
- Tipar tudo. Parametros, retornos, props, estados. Sem excecao.
- Usar os modelos existentes em `models/` e `types/`. Se precisar de um novo tipo, criar ali.
- Escrever testes para qualquer codigo novo (service, controller, hook, page).
- Rodar `npm run lint` e `npx tsc --noEmit` antes de commitar. O CI vai rejeitar se falhar.

#### NAO DEVE fazer (proibido)

- Usar `any`. Se nao sabe o tipo, use `unknown` e faca type narrowing.
- Acessar Firestore diretamente de controllers ou services. Sempre usar Repository.
- Commitar `.env`, `serviceAccount.json` ou qualquer credencial.
- Fazer `console.log` em producao. Usar `logger` (backend) ou remover antes do commit (frontend).
- Fazer push direto na main sem PR (exceto hotfix critico).

---

### Escalabilidade — Principio de Desenvolvimento

> Todo codigo deve ser escrito pensando em escala.
> Hoje temos poucos tenants. Amanha podemos ter centenas.
> Decisoes que parecem OK para 5 clientes podem quebrar com 50.

#### Mentalidade

Antes de implementar qualquer feature, pergunte:
- **E se tiver 100 tenants usando isso ao mesmo tempo?**
- **E se essa colecao tiver 1 milhao de documentos?**
- **E se 10 usuarios do mesmo tenant fizerem isso simultaneamente?**

Se a resposta for "vai dar problema", repensar a abordagem ANTES de codar.

#### Backend — Regras de Escala

| Regra | Por que | Exemplo |
|-------|---------|---------|
| Nunca buscar todos os registros sem paginacao | Com muitos documentos, a query fica lenta e consome memoria | `GET /admin/clientes` deve ter paginacao mesmo que hoje tenha poucos |
| Usar cursor (`startAfter`) em vez de offset | Offset no Firestore cobra por TODOS os documentos pulados | Historico de lotes ja usa cursor — seguir esse padrao |
| Operacoes concorrentes devem ser atomicas | Dois usuarios confirmando envio ao mesmo tempo podem ultrapassar limite | Usar `runTransaction()` para verificar e gravar no mesmo passo |
| Processar em lote, nao um por um | Criar 50 documentos um por um = 50 writes. Batch write = 1 operacao | Usar `writeBatch()` quando criar multiplos envios |
| Delay entre mensagens externas | APIs externas (Z-API) tem rate limit proprio | Cloud Tasks com delay incremental de 50s ja resolve isso |
| Nao carregar dados desnecessarios | Queries devem usar `select()` para trazer so os campos necessarios quando possivel | Em listagens, nao trazer o campo `mensagem` (texto longo) se so precisa do status |
| Indices compostos para queries frequentes | Sem indice, o Firestore rejeita a query ou faz full scan | Declarar em `firestore.indexes.json` |

#### Frontend — Regras de Escala

| Regra | Por que | Exemplo |
|-------|---------|---------|
| Listas grandes devem ter paginacao | Renderizar 500 cards trava o browser | Historico de lotes ja pagina — seguir esse padrao |
| Nao guardar dados grandes no estado | Array com 1000 contatos no `useState` causa re-renders pesados | Usar React Query com paginacao no servidor |
| Lazy loading para rotas pesadas | Bundle grande = carregamento lento na primeira visita | Rota `/admin` so e usada por superadmin — deveria ser `React.lazy` |
| Listeners realtime devem ter escopo limitado | `onSnapshot` em colecao inteira com 10k docs = 10k leituras na abertura | Sempre filtrar por loteId, tenantId, ou usar `limit()` |
| Evitar re-renders em listas | Re-render de 100 items por causa de 1 mudanca e desperdicio | `React.memo` em items de lista + `useCallback` em handlers |
| Cancelar listeners e requests ao desmontar | Memory leaks acumulam com navegacao entre pages | `useEffect` cleanup: `return () => unsubscribe()` |

#### Firestore — Regras de Escala

| Regra | Por que | Exemplo |
|-------|---------|---------|
| Subcollections em vez de arrays dentro do documento | Documento Firestore tem limite de 1MB. Array com 1000 imoveis estoura | `lotes/{id}/envios/{id}` em vez de `lotes/{id}.envios[]` |
| Document ID previsivel para lookups | `getDoc()` por ID e O(1). Query com `where` e O(n) | `imoveis_enviados/{hash}` — lookup direto sem query |
| Batch queries respeitando limite de 30 | Firestore `in` query aceita max 30 valores por vez | `DeduplicacaoService` ja faz isso — seguir o padrao |
| Dados que crescem indefinidamente precisam de estrategia de cleanup | `imoveis_enviados` cresce a cada envio, sem TTL | Planejar cleanup periodico para registros > 1 ano |
| Nao depender de contadores calculados em tempo real | Contar 10k documentos = 10k leituras | Manter contadores incrementais no documento pai (ex: `lote.enviados++`) |

#### Cloud Functions — Regras de Escala

| Regra | Por que | Exemplo |
|-------|---------|---------|
| Funcoes devem ser idempotentes | Cloud Tasks pode executar a mesma task 2x em retry | `processarEnvio` ja verifica se envio ja foi processado |
| Timeout adequado ao processamento | Funcao que demora mais que o timeout e cancelada sem feedback | Timeout atual de 60s e adequado para envio unitario |
| Memory adequada a carga | PDF grande pode estourar 256MB default | 512MB configurado para a funcao `api` |
| Uma funcao por responsabilidade | Funcao que faz tudo escala mal — Cloud Run escala instancias por funcao | `api` (HTTP) e `processarEnvio` (async) ja estao separadas |
| Manter inicializacao leve | Imports pesados no top-level aumentam cold start. Importar dentro da funcao se for uso raro | Firebase Admin e Express sao inevitaveis, mas evitar libs pesadas opcionais no escopo global |

> **Quando o projeto for rentavel:** considerar `minInstances: 1` na Cloud Function `api` para eliminar cold start de 3-5s na primeira request. Custo estimado: ~$10-15/mes. Tambem considerar backup automatico do Firestore via Cloud Scheduler, Dead Letter Queue no Cloud Tasks e ambiente de staging separado. Se for colocar algo desse no codigo, sempre perguntar se agora no momento é necessario.

---

### SOLID — Principios na Pratica

> Nao e teoria. E como decidir onde colocar codigo novo.

#### S — Single Responsibility (Responsabilidade Unica)

Cada arquivo faz UMA coisa. Se voce precisa de duas palavras com "e" para descrever o que o arquivo faz, ele provavelmente deveria ser dois.

| Camada | Responsabilidade unica | Exemplo correto | Sinal de problema |
|--------|----------------------|-----------------|-------------------|
| Controller | Receber request, chamar services, retornar response | `EnvioController.confirmar()` orquestra services | Controller fazendo query no Firestore diretamente |
| Service | Uma regra de negocio | `MessageBuilderService` monta mensagens | Service que monta mensagem E envia E registra historico |
| Repository | CRUD de uma colecao | `LoteRepository` opera sobre `lotes` | Repository com logica de negocio (validacao, calculos) |
| Hook | Uma preocupacao | `useFileUpload` gerencia upload | Hook que gerencia upload E faz fetch do dashboard |
| Page | Orquestrar hooks e componentes para uma rota | `Upload/index.tsx` | Page com 300+ linhas de logica (sem contar JSX) |
| Componente UI | Renderizar algo visual | `StatusBadge` mostra badge colorido | Componente que faz fetch de dados |

**Na pratica:**
- Logica cresceu demais num controller? Extrair para um service.
- Page ficou grande? Extrair hook ou componente.
- Service faz duas coisas? Dividir em dois services.

#### O — Open/Closed (Aberto para Extensao, Fechado para Modificacao)

Quando possivel, estender comportamento sem alterar codigo existente.

**Onde ja aplicamos:**
- `MessageBuilderService` — template customizavel por tenant via `textoPersonalizado`. Para mudar a mensagem de um tenant, nao precisa alterar o service.
- `errorHandler` — qualquer classe que estenda `AppError` e tratada automaticamente. Para criar um novo tipo de erro, so criar a classe.

**Como aplicar em codigo novo:**
```typescript
// CERTO — comportamento extensivel via configuracao/dados
// Adicionar novo tipo de operacao nao exige mudar o service
const operacaoTexto: Record<string, string> = {
  venda: "a venda",
  locacao: "a locacao",
};

// ERRADO — cada novo tipo exige alterar o if/else
if (operacao === "venda") { ... }
else if (operacao === "locacao") { ... }
// e se amanha tiver "permuta"? Mais um else if.
```

> Nao precisa criar abstractions para tudo. Se so existe uma implementacao e nao ha previsao de mais, codigo direto e OK. Aplicar quando houver variacao real.

#### L — Liskov Substitution

Nao usamos heranca no projeto (exceto `AppError`). Regra simples:

- Se criar uma classe que `extends` outra, a filha deve funcionar em qualquer lugar que a pai funciona.
- As classes de erro (`BadRequestError extends AppError`) seguem isso — o `errorHandler` trata qualquer `AppError`.

**Na pratica:** se precisar de heranca, use. Mas neste projeto, composicao (services chamando services) e o padrao preferido.

#### I — Interface Segregation (Segregacao de Interface)

Nao criar interfaces gigantes que forcam implementacoes a ter metodos que nao usam.

**Como aplicamos:**
- `Contato` tem campos basicos. `ContatoComStatus extends Contato` adiciona campos extras so onde necessario.
- Schemas Zod sao especificos por rota (nao um schema generico para tudo).

**Na pratica:**
```typescript
// CERTO — interfaces focadas
interface Contato {
  nome: string;
  telefone: string;
  imoveis: Imovel[];
}

interface ContatoComStatus extends Contato {
  status: "novo" | "ja_enviado";
  mensagemPreview?: string;
}

// ERRADO — interface unica com campos opcionais para todos os casos
interface Contato {
  nome: string;
  telefone: string;
  imoveis: Imovel[];
  status?: string;           // so usado em um lugar
  mensagemPreview?: string;  // so usado em um lugar
  loteId?: string;           // so usado em outro lugar
  enviadoEm?: Timestamp;     // so usado em outro lugar
}
```

#### D — Dependency Inversion (Inversao de Dependencia)

Camadas de cima nao devem depender de detalhes de camadas de baixo.

**Como aplicamos:**
- Controllers chamam Services, nao Firestore.
- Services chamam Repositories, nao Firestore.
- Frontend chama `apiClient`, nao `fetch` ou `axios` direto.

**Regra pratica:**
| Quem | Pode chamar | NAO pode chamar |
|------|------------|----------------|
| Controller | Service, Repository, Utils | Firestore, Z-API, Cloud Tasks |
| Service | Repository, outros Services, Utils | Firestore diretamente |
| Repository | Firestore (unico lugar que acessa o banco) | Services, Controllers |
| Hook | `apiClient`, outros hooks, Firestore (onSnapshot) | `axios` direto, `fetch` |
| Page | Hooks, componentes | `apiClient` direto, Firestore direto |

> **Sobre interfaces formais (ITenantRepository, IZApiService, etc.):** Hoje nao temos e o sistema funciona. Singletons com mock de modulo nos testes e suficiente. Se no futuro precisar trocar implementacao (ex: outro provedor WhatsApp), criar interface nessa hora.

---

### Backend — Regras de Desenvolvimento

#### Camadas (respeitar sempre)

```
Route → Validate (Zod) → Controller → Service → Repository → Firestore
```

| Regra | Detalhes |
|-------|----------|
| Controller nao acessa Firestore | Toda operacao de banco passa por Repository |
| Service contem logica de negocio | Controller orquestra services e retorna HTTP response |
| Repository e CRUD puro | Sem logica de negocio, sem validacao. So leitura/escrita no Firestore |
| Toda rota tem schema Zod | Criar schema em `schemas/` e aplicar via middleware `validate()` |
| Toda rota autenticada | Usar `requireAuth` middleware. Rotas admin adicionam `requireSuperAdmin` |

#### Criar nova rota — passo a passo

1. Criar schema Zod em `schemas/` (body, params, query conforme necessario)
2. Criar ou atualizar metodo no Controller
3. Se tiver logica de negocio, colocar no Service (nao no controller)
4. Se acessar Firestore, usar Repository existente ou criar metodo novo
5. Registrar a rota em `routes/` com middlewares: `requireAuth`, `validate(schema)`
6. Usar `ResponseHelper` para retorno (`success()`, `created()`, `badRequest()`, etc.)
7. Escrever teste unitario para o controller (mockando services/repos)

#### Error Handling

```typescript
// CERTO — usar classes de erro customizadas
throw new NotFoundError("Lote nao encontrado");
throw new BadRequestError("Limite diario excedido");

// ERRADO — retornar status code manualmente
res.status(404).json({ error: "not found" });
```

O `errorHandler` middleware intercepta todos os `AppError` e retorna a resposta padronizada. Para erros nao previstos, retorna 500.

#### Logger

```typescript
// CERTO
logger.info("Lote criado", { tenantId, loteId, total });
logger.error("Falha ao enviar mensagem", { envioId, erro: error.message });

// ERRADO
console.log("criou lote");
console.error(error);
```

Em producao, o logger gera JSON estruturado compativel com Google Cloud Logging. Em dev, gera output colorido.

#### Respostas HTTP

Sempre usar `ResponseHelper`. Nunca montar JSON manualmente.

```typescript
// CERTO
return ResponseHelper.success(res, data, "Lote criado com sucesso");
return ResponseHelper.created(res, { loteId });
return ResponseHelper.badRequest(res, "Filtro invalido");

// ERRADO
res.json({ success: true, data });
res.status(201).json({ id: loteId });
```

#### Firestore — Boas Praticas

| Regra | Motivo |
|-------|--------|
| Nunca usar offset para paginacao | Firestore cobra por documentos lidos. Usar cursor (`startAfter`) |
| Queries com `where` + `orderBy` em campos diferentes precisam de indice composto | Declarar em `firestore.indexes.json` ou o Firestore vai rejeitar em producao |
| Batch writes para operacoes multiplas | Se criar varios documentos de uma vez, usar `writeBatch()` |
| Transacoes para leitura + escrita atomica | Se ler um valor e depois escrever baseado nele (ex: verificar limite diario), usar `runTransaction()` |
| Document ID como hash quando fizer lookup por chave | Ex: `imoveis_enviados/{hash}` — evita query, usa `getDoc()` direto |

---

### Frontend — Regras de Desenvolvimento

#### Estrutura de Componentes

| Tipo | Local | Quando usar |
|------|-------|-------------|
| Page | `pages/NomePage/index.tsx` | Uma por rota. Orquestra hooks e componentes |
| UI Component | `components/ui/` | Componente visual reutilizavel, sem logica de negocio |
| Feature Component | `components/` | Componente especifico de uma feature (ex: `TenantGuard`) |
| Custom Hook | `hooks/` | Logica reutilizavel ou complexa extraida de pages |

#### Criar nova page — passo a passo

1. Criar `pages/NomePage/index.tsx`
2. Adicionar rota em `App.tsx` (dentro de `PrivateRoute` se autenticada)
3. Se tiver fetch de dados, criar custom hook em `hooks/` usando React Query
4. Se tiver dados realtime, usar `onSnapshot` no hook (nao React Query)
5. Usar componentes de `components/ui/` para loading, erros, headers
6. Escrever testes em `__tests__/pages/NomePage.test.tsx`

#### React Query vs onSnapshot

| Situacao | Usar | Motivo |
|----------|------|--------|
| Dados que o usuario busca (dashboard, historico, admin) | React Query (`useQuery`) | Cache, retry, invalidacao automatica |
| Dados que atualizam em tempo real (progresso de lote, role do usuario) | Firestore `onSnapshot` | Updates instantaneos sem polling |
| Acoes do usuario (upload, confirmar, cancelar) | React Query (`useMutation`) ou `apiClient` direto | Loading/error states |

**Configuracao padrao do React Query:**
- `staleTime: 30_000` (30s) — dados ficam frescos por 30 segundos
- `retry: 2` — tenta 2 vezes em caso de falha
- `refetchOnWindowFocus: false` — nao refetch ao voltar para a aba
- Invalidar queries relacionadas apos mutacoes (ex: `queryClient.invalidateQueries({ queryKey: ["dashboard"] })`)

#### Hooks — Quando extrair

Extrair logica de uma page para um custom hook quando:
- A logica envolve `useEffect` + `useState` juntos (ex: listener do Firestore)
- A logica e reutilizada em mais de uma page
- A page esta ficando grande (> 150 linhas de logica, sem contar JSX)

#### Performance — Re-renders

| Tecnica | Quando usar |
|---------|-------------|
| `useCallback` | Em handlers passados como prop para componentes filhos memoizados |
| `React.memo` | Em componentes de lista que renderizam muitos itens (ex: `EnvioCardItem`) |
| `useMemo` | Para calculos caros que dependem de poucos valores (raro neste projeto) |

**NAO usar `useCallback`/`useMemo` preventivamente.** So usar quando houver problema real de performance ou quando o componente filho usa `React.memo`.

#### Styled Components

| Regra | Detalhes |
|-------|----------|
| Usar tokens do theme | `${({ theme }) => theme.colors.primary}` — nunca hardcodar cores, espacamentos ou font sizes |
| Transient props para logica visual | `$active`, `$status`, `$color` — prefixo `$` evita que a prop va para o DOM |
| Componentes reutilizaveis em `components/ui/` | Se um estilo e usado em 2+ pages, extrair para componente UI |
| Responsividade com media query | `@media (min-width: 640px)` — breakpoint principal e 640px |

```typescript
// CERTO — usa theme
const Card = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

// ERRADO — valores hardcoded
const Card = styled.div`
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
`;
```

#### Estado — Onde guardar

| Tipo de dado | Onde | Exemplo |
|-------------|------|---------|
| Autenticacao (user, login, logout) | Context API (`AuthContext`) | `useAuth()` |
| Dados do servidor (dashboard, lotes, admin) | React Query | `useQuery(["dashboard"], ...)` |
| Dados realtime (progresso lote, tenant/role) | Firestore onSnapshot (dentro de hook) | `useLoteProgress()`, `useTenant()` |
| Estado local da page (form, modal aberto, tab ativa) | `useState` local | `const [tab, setTab] = useState("clientes")` |
| Dados entre pages (contatos da revisao) | `sessionStorage` com fallback | `sessionStorage.setItem("revisaoData", JSON.stringify(data))` |

**NAO criar novos Contexts** para dados do servidor. Usar React Query. Context so para dados globais do app (auth).

---

### Testes — Regras

#### O que testar

| Camada | O que testar | Como |
|--------|-------------|------|
| Service (backend) | Logica de negocio, edge cases, transformacoes | Jest, mockando repositories |
| Controller (backend) | Orquestracao, respostas HTTP, validacao | Jest, mockando services |
| Utils (backend) | Funcoes puras (phone, text, hash) | Jest, sem mocks |
| Page (frontend) | Renderizacao, interacoes do usuario, estados de loading/erro | React Testing Library |
| Hook (frontend) | Se tiver logica complexa, testar isolado | `renderHook` do Testing Library |

#### Estrutura de teste

```
// Backend
src/__tests__/
├── controllers/     # Testa controller mockando services
├── services/        # Testa service mockando repositories
├── utils/           # Testa funcoes puras
├── integration/     # Testa fluxo completo (parse → clean → message)
└── mocks/           # Mocks compartilhados (firestore, etc)

// Frontend
src/__tests__/
├── pages/           # Testa cada page com providers
├── setup.ts         # Config global do Jest
└── testUtils.tsx    # renderWithProviders helper
```

#### Mocks — Padrao

- **Backend**: Mockar repositories (nao Firestore diretamente). Mockar services quando testar controllers.
- **Frontend**: Usar `renderWithProviders()` de `testUtils.tsx` que inclui Router, QueryClient e Theme. Mockar `apiClient`, `useAuth`, `useTenant`.

#### Cobertura minima esperada

| Metrica | Backend | Frontend |
|---------|---------|----------|
| Statements | > 85% | > 85% |
| Branches | > 75% | > 70% |

---

### Seguranca — Regras

| Regra | Detalhes |
|-------|----------|
| Toda rota requer auth | Middleware `requireAuth` verifica token Firebase e carrega user do Firestore |
| Rotas admin requerem role | Middleware `requireSuperAdmin` verifica `role === "superadmin"` |
| Firestore Rules isolam por tenant | Funcao `isTenantMember(tenantId)` valida que usuario pertence ao tenant |
| Client nao escreve no Firestore | Todas as writes sao via backend (API). Rules so permitem read. |
| CORS restrito | Apenas dominios em `ALLOWED_ORIGINS` podem fazer requests |
| Rate limiting ativo | 100 req/min global, 10/min para upload de PDF |
| Credenciais no `.env` | Nunca no codigo. `.env` esta no `.gitignore` |
| Secrets no CI via GitHub | `FIREBASE_SERVICE_ACCOUNT` e `VITE_FIREBASE_*` como secrets do repo |

---

### Nomenclatura (expandido)

| Tipo | Padrao | Exemplo | Local |
|------|--------|---------|-------|
| Service | PascalCase + Service | `PdfParserService` | `services/` |
| Controller | PascalCase + Controller | `EnvioController` | `controllers/` |
| Repository | PascalCase + Repository | `LoteRepository` | `repositories/` |
| Hook | camelCase com use | `useTenant` | `hooks/` |
| Rota | kebab-case | `/api/envios/lotes/:id/cancelar` | `routes/` |
| Modelo/Interface | PascalCase | `Imovel`, `Contato` | `models/` ou `types/` |
| Schema Zod | camelCase + Schema | `confirmarEnvioSchema` | `schemas/` |
| Util | camelCase | `normalizarTelefone` | `utils/` |
| Styled Component | PascalCase | `ContatoCard`, `DashCard` | Junto da page ou em `components/ui/` |
| Teste | NomeOriginal + `.test.ts(x)` | `PdfParserService.test.ts` | `__tests__/` espelhando estrutura |
| Page | PascalCase / pasta | `Upload/index.tsx` | `pages/` |
| UI Component | PascalCase | `StatusBadge.tsx` | `components/ui/` |

---

### Checklist para Code Review

Antes de aprovar um PR, verificar:

**Backend:**
- [ ] Rota tem schema Zod com `validate()` middleware?
- [ ] Controller usa `ResponseHelper` para todas as respostas?
- [ ] Acesso ao Firestore e via Repository (nao direto)?
- [ ] Erros usam classes de `utils/errors.ts` (nao `res.status()` manual)?
- [ ] Logs usam `logger` (nao `console.log`)?
- [ ] Testes cobrem happy path + pelo menos 1 caso de erro?
- [ ] Sem `any` no TypeScript?

**Frontend:**
- [ ] Componente usa tokens do theme (nao valores hardcoded)?
- [ ] Fetch de dados usa React Query ou onSnapshot (nao `useEffect` + `fetch`)?
- [ ] Componente nao esta grande demais (> 200 linhas = considerar extrair)?
- [ ] Props tipadas com interface ou type?
- [ ] Teste cobre renderizacao + interacao principal?
- [ ] Sem `any` no TypeScript?
