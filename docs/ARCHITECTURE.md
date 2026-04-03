# Arquitetura - PDocSend

> Documento de referencia para manter consistencia em novas implementacoes.
> Ultima atualizacao: 03/04/2026

---

## Visao Geral

```
Frontend (React + TypeScript)              Backend (Express + TypeScript)

Upload → Revisao → Envio                   Route → Controller → Service → Firestore
    ↓                                           ↓
apiClient (Axios)  ──── REST API ────►    Auth Middleware (JWT + tenant)
    ↓                                           ↓
Firestore (onSnapshot) ◄───────────      Cloud Tasks → processarEnvio → Z-API
```

### Stack

| Camada | Tecnologia | Responsabilidade |
|--------|-----------|-----------------|
| Frontend | React 18 + TypeScript | Interface do usuario |
| Estilizacao | Styled Components | CSS-in-JS com tema |
| Roteamento | React Router 6 | Navegacao SPA |
| HTTP Client | Axios | Comunicacao com backend |
| Realtime | Firestore onSnapshot | Progresso de envio |
| Backend | Express + TypeScript | API REST |
| Cloud Functions | Firebase Gen 2 | Hosting do backend |
| Fila | Google Cloud Tasks | Envio assincrono |
| WhatsApp | Z-API | Envio de mensagens |
| Database | Cloud Firestore | Persistencia |
| Auth | Firebase Auth | Autenticacao |
| CI/CD | GitHub Actions | Lint, testes, deploy |

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

### Saudacao Dinamica

Calculada no momento do envio (fuso Brasilia):
- Antes das 12h → "Bom dia"
- 12h-18h → "Boa tarde"
- Apos 18h → "Boa noite"

---

## Estrutura de Testes

### Backend

```
src/__tests__/
├── controllers/
│   └── EnvioController.test.ts      # Confirmar, cancelar, listar, historico
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

### Frontend

```
src/__tests__/
├── pages/
│   ├── Login.test.tsx               # Login, recuperacao, tenant check
│   ├── Register.test.tsx            # Registro, validacao, sucesso
│   └── Upload.test.tsx              # Upload, drag/drop, erros, loading
├── setup.ts                         # Jest DOM setup
└── testUtils.tsx                    # Providers para testes
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
