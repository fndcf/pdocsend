# PDocSend - Setup para Producao

## Pre-requisitos

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud CLI (`gcloud`) - para Cloud Tasks
- Conta na Z-API (https://z-api.io)

---

## 1. Firebase CLI - Login e selecionar projeto

```bash
firebase login
firebase use pdocsend
```

---

## 2. Ativar APIs no Google Cloud

Acesse https://console.cloud.google.com/apis/library e ative:

- **Cloud Tasks API**
- **Cloud Functions API** (ja deve estar ativa)
- **Identity Toolkit API** (ja deve estar ativa via Firebase Auth)

Ou via CLI:

```bash
gcloud services enable cloudtasks.googleapis.com --project=pdocsend
```

---

## 3. Criar fila do Cloud Tasks

```bash
gcloud tasks queues create envio-whatsapp \
  --location=southamerica-east1 \
  --max-dispatches-per-second=1 \
  --max-concurrent-dispatches=1 \
  --max-attempts=3 \
  --min-backoff=10s \
  --max-backoff=300s \
  --project=pdocsend
```

Parametros:
- `max-dispatches-per-second=1`: 1 mensagem por segundo (respeitando delay do Cloud Tasks)
- `max-concurrent-dispatches=1`: 1 envio por vez
- `max-attempts=3`: tenta 3 vezes em caso de falha
- `min-backoff=10s`: espera 10s antes de retry

---

## 4. Configurar Z-API

1. Acesse https://z-api.io e crie uma conta
2. Crie uma nova instancia
3. Escaneie o QR Code com o WhatsApp do usuario
4. Anote:
   - **Instance ID**: aparece na URL da instancia
   - **Token**: aparece nas configuracoes da instancia

---

## 5. Criar tenant e user no Firestore

Apos o Felipe criar conta no sistema (tela de registro), voce precisa:

### 5.1 Ativar o usuario no Firebase Auth

1. Acesse Firebase Console > Authentication > Users
2. Encontre o usuario 
3. Clique nos 3 pontos > Ativar conta
4. Anote o **UID** do usuario

### 5.2 Rodar o script de seed

O script cria o tenant e vincula ao usuario:

```bash
cd backend
npx ts-node scripts/seed-tenant.ts \
  --uid="UID_DO_USUARIO" \
  --nome="Imobiliaria" \
  --corretor="Corretor" \
  --empresa="Imobiliaria" \
  --cargo="corretor" \
  --zapiInstanceId="SEU_INSTANCE_ID" \
  --zapiToken="SEU_TOKEN"
```

Ou criar manualmente no Firebase Console > Firestore:

**Collection: tenants**
```
Document ID: (auto)
{
  nome: "Imobiliaria",
  zapiInstanceId: "SEU_INSTANCE_ID",
  zapiToken: "SEU_TOKEN",
  mensagemTemplate: {
    nomeCorretor: "Corretor",
    nomeEmpresa: "Imobiliaria",
    cargo: "corretor"
  },
  criadoEm: (timestamp)
}
```

**Collection: users**
```
Document ID: UID_DO_USUARIO
{
  email: "usuario@email.com",
  nome: "Usuario",
  tenantId: "ID_DO_TENANT_CRIADO_ACIMA",
  role: "admin",
  criadoEm: (timestamp)
}
```

---

## 6. Configurar variaveis de ambiente do backend

### Para Cloud Functions (producao):

```bash
firebase functions:config:set \
  zapi.instance_id="SEU_INSTANCE_ID" \
  zapi.token="SEU_TOKEN" \
  app.allowed_origins="https://pdocsend.web.app,https://pdocsend.firebaseapp.com"
```

### Para desenvolvimento local:

Edite `backend/.env`:
```
FB_PROJECT_ID=pdocsend
NODE_ENV=development
PORT=5000
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 7. Build e Deploy

### Backend (Cloud Functions):

```bash
cd backend
npm install
npm run build
```

### Frontend:

```bash
cd frontend
npm install
npm run build
```

### Deploy completo:

```bash
# Na raiz do projeto
firebase deploy
```

Ou deploy parcial:

```bash
firebase deploy --only hosting     # so frontend
firebase deploy --only functions   # so backend
firebase deploy --only firestore   # so rules
```

---

## 8. Deploy das Firestore Rules

As rules ja estao configuradas no arquivo `firestore.rules`. O deploy acontece automaticamente com `firebase deploy`, mas pode ser feito separado:

```bash
firebase deploy --only firestore:rules
```

---

## 9. Verificar deploy

1. Acesse https://pdocsend.web.app
2. Faca login com o usuario 
3. Faca upload de um PDF de teste
4. Verifique se os dados sao extraidos corretamente
5. Confirme um envio pequeno (1-2 contatos) para testar

---

## 10. Emuladores (desenvolvimento local)

Para rodar tudo localmente sem afetar producao:

### Terminal 1 - Emuladores Firebase:
```bash
firebase emulators:start
```

### Terminal 2 - Backend:
```bash
cd backend
npm run dev:emulators
```

### Terminal 3 - Frontend:
```bash
cd frontend
npm run dev:emulators
```

Acesse:
- Frontend: http://localhost:3000
- Emulator UI: http://localhost:4000
- Backend API: http://localhost:5000

---

## Troubleshooting

### Cloud Tasks nao executa
- Verifique se a API Cloud Tasks esta ativada
- Verifique se a fila `envio-whatsapp` existe: `gcloud tasks queues list --location=southamerica-east1`
- Verifique se a Cloud Function `processarEnvio` esta deployada: `firebase functions:list`

### Z-API nao envia
- Verifique se a instancia esta conectada (QR Code escaneado)
- Teste manualmente: `curl -X GET https://api.z-api.io/instances/SEU_ID/token/SEU_TOKEN/status`
- Verifique se o telefone esta no formato correto (5511XXXXXXXXX)

### Usuario nao consegue logar
- Verifique se a conta esta ativada no Firebase Auth
- Verifique se existe documento na collection `users` com o UID correto
- Verifique se o `tenantId` no documento do user aponta para um tenant valido

### PDF nao extrai dados
- O formato do PDF deve seguir o padrao analisado (campos: Proprietario, Telefone, Edificio, etc.)
- PDFs com layout muito diferente podem precisar de ajuste no PdfParserService
