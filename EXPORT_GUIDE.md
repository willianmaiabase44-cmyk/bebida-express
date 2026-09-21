# 📤 GUIA DE EXPORTAÇÃO — SMOKE BEBIDAS

**Versão:** Fase 6 — Independência do Base44
**Data:** 2026-09-21

---

## 1. VISÃO GERAL

O Smoke Bebidas foi migrado de uma plataforma Base44 (backend-as-a-service) para
um stack independente: **React + Vite** (frontend) e **Node.js + Express + PostgreSQL**
(backend). Este guia descreve como exportar, configurar e executar o projeto
localmente no Trae IDE ou VS Code.

### Estrutura do Projeto

```
/
├── src/                    # Frontend (React + Vite)
│   ├── pages/              # Páginas da loja e admin
│   ├── components/         # Componentes reutilizáveis
│   ├── services/           # Camada de serviços (API REST)
│   ├── context/            # Contextos React (Cart, Customer)
│   ├── lib/                # Utilitários (apiClient, AuthContext, etc.)
│   └── api/                # Cliente API (base44Client.js → stub)
├── server/                 # Backend (Node.js + Express + PostgreSQL)
│   ├── src/
│   │   ├── routes/         # Endpoints REST
│   │   ├── controllers/    # Lógica dos controllers
│   │   ├── services/       # Lógica de negócio
│   │   ├── repositories/    # Acesso ao PostgreSQL
│   │   ├── middleware/     # Auth, rate limit, adminOnly
│   │   ├── db/             # Migrations e seed
│   │   └── config/         # Configuração
│   ├── backup/             # Backups JSON + relatórios
│   └── package.json
├── public/                 # Assets estáticos (logo.png)
├── vite.config.js          # Config Vite (com @base44/vite-plugin)
├── vite.config.local.js    # Config Vite STANDALONE (sem Base44)
├── package.json            # Deps (com @base44/sdk)
├── package.local.json      # Deps STANDALONE (sem Base44)
└── .env.example            # Template de variáveis de ambiente
```

---

## 2. PRÉ-REQUISITOS

- **Node.js** 18+ e npm
- **PostgreSQL** 14+
- **Trae IDE** ou **VS Code** com extensão ESLint
- **Git** (para controle de versão)

---

## 3. PASSO A PASSO — EXPORTAÇÃO

### Passo 1: Baixar o Código

No editor Base44, baixe o código-fonte completo do projeto (ZIP ou via Git).

### Passo 2: Substituir Arquivos de Configuração

No diretório raiz do projeto baixado, substitua os arquivos de configuração
pelos arquivos `.local`:

```bash
# Substituir vite.config.js
cp vite.config.local.js vite.config.js

# Substituir package.json
cp package.local.json package.json

# Substituir base44Client.js (stub vazio)
cp src/api/base44Client.local.js src/api/base44Client.js

# Substituir AuthContext.jsx (sem import do SDK)
cp src/lib/AuthContext.local.jsx src/lib/AuthContext.jsx

# Substituir app-params.js (sem VITE_BASE44_*)
cp src/lib/app-params.local.js src/lib/app-params.js
```

### Passo 3: Remover Página OAuthConsent (opcional)

A página `src/pages/OAuthConsent.jsx` é específica do MCP Server da Base44.
Se você não usa MCP, pode removê-la:

```bash
rm src/pages/OAuthConsent.jsx
```

### Passo 4: Configurar Variáveis de Ambiente

#### Frontend

```bash
cp .env.example .env
# Edite .env se necessário (VITE_SERVER_API_URL)
```

#### Backend

```bash
cd server
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL
```

Configuração do backend (`server/.env`):

```env
# Servidor
PORT=4000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smoke_bebidas
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# JWT (gere com: openssl rand -hex 32)
JWT_SECRET=sua_chave_secreta_aqui
JWT_REFRESH_SECRET=sua_chave_refresh_aqui

# Upload
UPLOAD_DIR=./uploads
```

### Passo 5: Instalar Dependências

```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

### Passo 6: Configurar PostgreSQL

```bash
# Criar banco de dados
createdb smoke_bebidas

# Executar migrations
cd server
npm run migrate
cd ..
```

### Passo 7: Importar Dados de Backup (opcional)

Se você tem os arquivos JSON de backup da Base44:

```bash
cd server
npm run import:backup
cd ..
```

### Passo 8: Iniciar o Projeto

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
npm run dev
```

O frontend estará em `http://localhost:5173` e o backend em `http://localhost:4000`.

---

## 4. BUILD DE PRODUÇÃO

```bash
# Frontend
npm run build
# Gera dist/ com os arquivos estáticos

# Backend (não precisa build — é Node.js puro)
cd server
npm start
```

---

## 5. DEPLOY

### Opção A: VPS (Hostinger, DigitalOcean, etc.)

1. Faça upload do código para o servidor
2. Configure `.env` no servidor
3. Instale dependências: `npm install` (frontend e backend)
4. Execute migrations: `cd server && npm run migrate`
5. Build do frontend: `npm run build`
6. Sirva o frontend com nginx (aponte para `dist/`)
7. Inicie o backend: `cd server && npm start` (use PM2 para produção)

### Opção B: Docker

```bash
# Na raiz do projeto
docker-compose up -d
```

O `docker-compose.yml` já está configurado com PostgreSQL + backend.

---

## 6. REFERÊNCIAS RESTANTES AO BASE44

Após aplicar os arquivos `.local`, as seguintes referências podem permanecer:

| Arquivo | Referência | Ação |
|---|---|---|
| `src/pages/OAuthConsent.jsx` | Comentários sobre MCP | Remover o arquivo (Passo 3) |
| `src/lib/app-params.js` | Prefixo `smoke_` em localStorage | Já atualizado no `.local` |
| `vite.config.js` | Plugin `exclude-server-dir` | Manter (não é do Base44) |

### Validação Final

Após aplicar todos os `.local`, execute:

```bash
# Verificar se ainda há referências ao Base44
grep -ri "base44" src/ --include="*.jsx" --include="*.js" | grep -v node_modules

# Verificar se o build funciona
npm run build
```

Se o `grep` retornar apenas comentários e o `build` passar, a migração está completa.

---

## 7. BACKUPS

Os backups dos dados originais da Base44 estão em `server/backup/`:

- `Product.json`, `Order.json`, `Customer.json`, etc. — dados exportados
- `PHASE3_REPORT.md`, `PHASE4_REPORT.md`, `PHASE5_REPORT.md` — relatórios
- `RESTORATION_PLAN.md`, `ID_MAPPING.md` — documentação da migração
- `importBackup.js` — script de importação PostgreSQL

**NÃO apague os backups.** Eles são a fonte de dados para a importação.

---

## 8. TESTES PENDENTES

Os seguintes testes só podem ser executados localmente com PostgreSQL:

1. Listagem de produtos na loja
2. Carrinho e checkout completos
3. Criação de pedido com idempotência
4. PDV — venda atômica
5. Gestão de produtos (CRUD + upload)
6. Gestão de estoque (movimentações)
7. Notificações de pedidos (polling)
8. Upload de imagens autenticado
9. Relatórios com dados reais
10. Validação de cupom e cálculo de frete

---

## 9. BLOQUEIOS IDENTIFICADOS

1. **Build no editor Base44**: Não é possível remover `@base44/vite-plugin`
   in-place sem quebrar o editor. Os arquivos `.local` estão preparados para
   aplicação no Trae IDE.

2. **Testes funcionais**: Não é possível testar a API sem PostgreSQL rodando.
   O ambiente Base44 não tem backend Node.js/PostgreSQL.

3. **Logo original**: O logo foi baixado do CDN do Base44 e salvo em
   `public/logo.png`. Se o projeto Base44 for desativado, o CDN deixará de
   servir a URL original, mas o arquivo local já está preservado.

4. **OAuthConsent.jsx**: Esta página é específica do MCP Server da Base44.
   Deve ser removida no Trae IDE (Passo 3).

---

## 10. CHECKLIST DE EXPORTAÇÃO

- [ ] Código baixado do editor Base44
- [ ] `vite.config.local.js` → `vite.config.js`
- [ ] `package.local.json` → `package.json`
- [ ] `src/api/base44Client.local.js` → `src/api/base44Client.js`
- [ ] `src/lib/AuthContext.local.jsx` → `src/lib/AuthContext.jsx`
- [ ] `src/lib/app-params.local.js` → `src/lib/app-params.js`
- [ ] `OAuthConsent.jsx` removido (opcional)
- [ ] `.env` configurado (frontend)
- [ ] `server/.env` configurado (backend)
- [ ] `npm install` executado (frontend e backend)
- [ ] PostgreSQL criado e migrations executadas
- [ ] Backup importado (opcional)
- [ ] `npm run dev` funcionando (frontend e backend)
- [ ] `npm run build` passou sem erros
- [ ] `grep -ri "base44" src/` sem referências funcionais
- [ ] Testes funcionais executados localmente