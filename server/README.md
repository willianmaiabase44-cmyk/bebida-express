# Smoke Bebidas — Backend Próprio

Backend paralelo em Node.js + Express + PostgreSQL para migração futura do Base44.

## ⚠️ Etapa 1 — Apenas infraestrutura

Este backend **não substitui o Base44** ainda. O frontend continua funcionando 100% no Base44.
Nesta etapa, apenas a infraestrutura foi criada: estrutura de pastas, migrations, middleware, rotas (pendentes) e health check.

## Como rodar

```bash
cd server
cp .env.example .env   # edite com seus valores
npm install
npm run migrate        # cria as 14 tabelas no PostgreSQL
npm run dev            # inicia o backend
```

## Health check

```bash
curl http://localhost:4000/api/health
# { "ok": true, "database": "connected", "timestamp": "..." }
```

## Estrutura

```
server/
├── src/
│   ├── config/          # Configurações (env, jwt, db)
│   ├── controllers/     # (futuro) handlers das rotas
│   ├── routes/          # 16 módulos de rotas (/api/*)
│   ├── services/        # Lógica de negócio (orderService, couponService, etc.)
│   ├── middleware/      # auth, adminOnly, errorHandler, validate, notImplemented
│   ├── repositories/    # (futuro) camada de acesso a dados
│   ├── utils/           # password (bcrypt), jwt
│   ├── db/              # Pool PostgreSQL + migrations + helper de transação
│   ├── app.js           # Express app
│   └── server.js        # Entry point
├── uploads/             # Imagens (Multer)
├── .env.example
└── package.json
```

## Rotas preparadas (pendentes — Etapa 2)

- `/api/health` ✅ (implementado)
- `/api/upload` ✅ (implementado — Multer)
- `/api/auth` 🔲
- `/api/products` 🔲
- `/api/orders` 🔲
- `/api/customers` 🔲
- `/api/addresses` 🔲
- `/api/sales` 🔲
- `/api/motoboys` 🔲
- `/api/deliveries` 🔲
- `/api/reviews` 🔲
- `/api/stock-movements` 🔲
- `/api/promotions` 🔲
- `/api/store-settings` 🔲
- `/api/suppliers` 🔲
- `/api/coupons` 🔲
- `/api/freight` 🔲

Endpoints pendentes retornam `501 Not Implemented` com mensagem clara.