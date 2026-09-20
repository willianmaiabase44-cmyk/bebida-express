# 🚀 Smoke Bebidas — Instalação Local no Trae IDE (Windows/PowerShell)

Guia completo para instalar e rodar o Smoke Bebidas localmente no Windows usando o Trae IDE e PowerShell.

---

## 📋 Pré-requisitos

| Software | Versão mínima | Como verificar |
|---|---|---|
| **Node.js** | 20.0+ | `node --version` |
| **npm** | 10.0+ | `npm --version` |
| **PostgreSQL** | 16+ | `psql --version` |
| **Docker Desktop** | 4.20+ (opcional) | `docker --version` |
| **Git** | 2.40+ | `git --version` |
| **Trae IDE** | qualquer | — |

> **Recomendado:** Use Docker Desktop para o PostgreSQL — evita instalação manual e configuração de serviço.

---

## 1. Baixar o projeto do Base44

### Opção A — Exportar como ZIP (mais simples)

1. Abra o editor do app no [Base44](https://base44.com).
2. Clique em **More actions** (⋮) na barra superior.
3. Selecione **Export project as ZIP**.
4. Salve o arquivo `.zip` no seu computador.
5. Extraia o ZIP no Trae IDE: `File → Open Folder → selecione a pasta extraída`.

> ⚠️ Requer plano **Builder** ou superior.

### Opção B — Clonar via GitHub

1. Abra o **Dashboard** do app no Base44.
2. Clique no ícone do **GitHub** no canto superior direito.
3. Selecione **Connect to GitHub** e autorize o **Base44 Builder**.
4. Escolha a conta/organização e o repositório.
5. Clone localmente no PowerShell:

```powershell
cd C:\Projetos
git clone https://github.com/SEU_USUARIO/smoke-bebidas.git
cd smoke-bebidas
```

> ⚠️ Requer plano **Builder** ou superior. Após mudanças locais, faça `git push` e clique em **Publish** no Base44.

---

## 2. Baixar os backups (dados sensíveis)

Os backups **NÃO estão no ZIP/Git** (são excluídos pelo `.gitignore`). Eles contêm dados de clientes e hashes de senhas — baixe separadamente.

### Procedimento

1. No editor do Base44, abra cada arquivo em `server/backup/`:
   - `StoreSettings.json`, `Product.json`, `Order.json`, `Customer.json`
   - `CustomerAddress.json`, `Promotion.json`, `DeliveryDriver.json`
   - `Coupon.json`, `Supplier.json`, `Sale.json`
   - `StockMovement.json`, `DeliveryReview.json`, `Delivery.json`
   - `logo-smoke-bebidas.png`, `favicon-base44.svg`

2. Copie o conteúdo de cada arquivo JSON.

3. Crie os arquivos localmente no Trae IDE:

```powershell
# Criar a pasta de backup
mkdir C:\Projetos\smoke-bebidas\server\backup -Force

# Abrir a pasta no Trae IDE e colar o conteúdo de cada arquivo
# OU usar o PowerShell para criar cada arquivo:
New-Item -Path "C:\Projetos\smoke-bebidas\server\backup\Product.json" -ItemType File -Force
# (cole o conteúdo no editor do Trae IDE)
```

4. **Verifique** que os 13 JSONs + 2 imagens estão na pasta `server\backup\`:

```powershell
# Listar arquivos de backup (deve mostrar 13 .json + 2 imagens + .gitignore)
Get-ChildItem C:\Projetos\smoke-bebidas\server\backup\ | Select-Object Name, Length
```

> ⚠️ Os backups **NUNCA** devem ser enviados ao Git. O `.gitignore` já os exclui.

---

## 3. Instalar dependências

```powershell
# === Frontend (raiz do projeto) ===
cd C:\Projetos\smoke-bebidas
npm install

# === Backend ===
cd C:\Projetos\smoke-bebidas\server
npm install
```

---

## 4. Configurar variáveis de ambiente

```powershell
# Copiar template
cd C:\Projetos\smoke-bebidas\server
Copy-Item .env.example .env

# Abrir para editar no Trae IDE
# (ou use: notepad .env)
```

### Editar o `.env` com seus valores

```env
NODE_ENV=development
BACKEND_PORT=4000

# Banco de dados
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=smoke_bebidas
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua_senha_real_aqui

# JWT — gerar chaves aleatórias (ver abaixo)
JWT_SECRET=cole_a_chave_1_aqui
JWT_REFRESH_SECRET=cole_a_chave_2_aqui
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:5173

# Admin inicial (para seed)
ADMIN_EMAIL=admin@smokebebidas.com
ADMIN_PASSWORD=trocar_esta_senha
ADMIN_NAME=Administrador
```

### Gerar JWT secrets (execute no PowerShell)

```powershell
# Gerar duas chaves aleatórias de 64 caracteres
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copie as duas linhas geradas e cole no `.env`.

---

## 5. Iniciar o PostgreSQL

### Opção A — Docker (recomendado)

```powershell
# Na raiz do projeto
cd C:\Projetos\smoke-bebidas

# ⚠️ ANTES de subir o Docker, edite o docker-compose.yml:
# Descomente as linhas "ports" do serviço postgres para acessar localmente:
#
#   postgres:
#     ...
#     ports:
#       - "${POSTGRES_PORT:-5432}:5432"
#
# Salve o arquivo e continue:

# Subir o PostgreSQL
docker compose up -d postgres

# Verificar se está rodando
docker compose ps

# Ver logs (opcional)
docker compose logs postgres
```

> **Correção do Docker Compose:** O comando correto é `docker compose` (espaço, sem híphen) — Docker Compose v2 incluído no Docker Desktop. O comando `docker-compose` (com hífen) é da versão v1 (legada).

### Opção B — PostgreSQL instalado localmente

```powershell
# Criar o banco de dados
psql -U postgres -c "CREATE DATABASE smoke_bebidas;"

# Verificar
psql -U postgres -c "\l" | Select-String smoke_bebidas
```

---

## 6. Executar migrations

```powershell
cd C:\Projetos\smoke-bebidas\server

# Aplicar as 6 migrations (cria 14 tabelas + índices + enums)
npm run migrate

# Verificar migrations aplicadas
# (conecte ao banco e liste a tabela de controle)
psql -U postgres -d smoke_bebidas -c "SELECT filename, applied_at FROM _migrations ORDER BY id;"
```

> ✅ Deve mostrar 6 migrations: `001_init.sql` até `006_idempotency_key.sql`.

---

## 7. Simular a importação (dry-run)

```powershell
cd C:\Projetos\smoke-bebidas\server

# Simula a importação — NÃO grava nada no banco
npm run import:backup:dry-run
```

> ✅ Deve mostrar "DRY-RUN: Transação revertida (nenhum dado gravado)" e listar as 13 entidades com contagens. Nenhum erro deve aparecer.

---

## 8. Executar a importação

```powershell
cd C:\Projetos\smoke-bebidas\server

# Importa os 50 registros em transação (rollback automático em caso de erro)
npm run import:backup
```

> ✅ Deve mostrar "Transação commitada com sucesso!" e um resumo com:
> - Total source: 50 registros
> - Total importado: 50 registros
> - Inconsistências: 2 (produto órfão "Whisky Jack Daniel's" — preservado no histórico)
> - FKs órfãs: 0
> - Divergências financeiras: 0

### Verificar relatório gerado

```powershell
# O importador gera um relatório em server/backup/IMPORT_LOG.md
Get-Content C:\Projetos\smoke-bebidas\server\backup\IMPORT_LOG.md
```

---

## 9. Validar a importação

```powershell
cd C:\Projetos\smoke-bebidas\server

# Executa apenas as validações SQL no banco importado
npm run import:backup:validate
```

> ✅ Deve mostrar contagens por tabela, 0 FKs órfãs, 0 divergências financeiras, StoreSettings = 1.

---

## 10. Criar o administrador

```powershell
cd C:\Projetos\smoke-bebidas\server

# Cria o admin com base em ADMIN_EMAIL/ADMIN_PASSWORD do .env
# Idempotente: NÃO sobrescreve se já existir
npm run seed
```

> ✅ Deve mostrar "Admin criado: admin@smokebebidas.com" ou "Admin já existe".

---

## 11. Redefinir senha do motoboy

Após a importação, o hash PBKDF2 do Base44 não é compatível com bcrypt. Redefina a senha:

```powershell
cd C:\Projetos\smoke-bebidas\server

# Substitua <login> pelo login real do motoboy (ver no backup DeliveryDriver.json)
npm run reset:motoboy -- <login_do_motoboy>
```

> A senha será solicitada de forma **interativa e mascarada** (asteriscos) — não aparece na tela nem no histórico do shell.
>
> ✅ Deve mostrar "Senha redefinida com sucesso (hash bcrypt)."

---

## 12. Copiar logo e favicon

```powershell
# Criar pasta de uploads
mkdir C:\Projetos\smoke-bebidas\server\uploads -Force

# Copiar logo
Copy-Item C:\Projetos\smoke-bebidas\server\backup\logo-smoke-bebidas.png C:\Projetos\smoke-bebidas\server\uploads\

# Copiar favicon para a pasta public do frontend
Copy-Item C:\Projetos\smoke-bebidas\server\backup\favicon-base44.svg C:\Projetos\smoke-bebidas\public\
```

---

## 13. Iniciar o sistema

### Terminal 1 — Backend

```powershell
cd C:\Projetos\smoke-bebidas\server
npm run dev
```

> ✅ Backend rodando em `http://localhost:4000`

### Terminal 2 — Frontend

```powershell
cd C:\Projetos\smoke-bebidas
npm run dev
```

> ✅ Frontend rodando em `http://localhost:5173`

---

## 14. Verificar o sistema

```powershell
# Health check do backend
Invoke-RestMethod -Uri http://localhost:4000/api/health

# Listar produtos (deve retornar 13)
(Invoke-RestMethod -Uri http://localhost:4000/api/products).Count

# Login admin (substitua a senha)
$body = @{email="admin@smokebebidas.com"; password="sua_senha"} | ConvertTo-Json
$resp = Invoke-RestMethod -Uri http://localhost:4000/api/auth/admin/login -Method POST -Body $body -ContentType "application/json"
$token = $resp.token

# Listar pedidos com token
$headers = @{Authorization = "Bearer $token"}
(Invoke-RestMethod -Uri http://localhost:4000/api/orders -Headers $headers).Count
# Deve retornar 6
```

---

## 🔒 Segurança — O que NÃO vai para o Git

| Arquivo | Protegido por | Conteúdo |
|---|---|---|
| `.env` | `.gitignore` (raiz + server) | Senhas, JWT secrets |
| `server/backup/*.json` | `server/.gitignore` → `backup/` | Dados de clientes, hashes |
| `server/backup/logo-*` | `server/.gitignore` → `backup/` | Imagens |
| `server/uploads/*` | `server/.gitignore` → `uploads/*` | Uploads de usuários |
| `node_modules/` | `.gitignore` | Dependências |

### Verificar antes de commitar

```powershell
# Verificar se algum arquivo sensível está sendo rastreado
cd C:\Projetos\smoke-bebidas
git status

# NENHUM destes deve aparecer:
# - .env
# - server/.env
# - server/backup/*.json
# - server/backup/*.png
```

---

## 📁 Estrutura de diretórios

```
smoke-bebidas/
├── src/                    # Frontend (React + Vite)
├── server/                 # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/         # Configuração (.env)
│   │   ├── db/             # Migrations + importador + seed
│   │   │   ├── migrations/ # 6 arquivos SQL
│   │   │   ├── importBackup.js
│   │   │   ├── resetMotoboyPassword.js
│   │   │   ├── runMigrations.js
│   │   │   └── seed.js
│   │   ├── routes/         # 16 módulos de rotas
│   │   ├── services/       # Lógica de negócio
│   │   └── ...
│   ├── backup/             # ⚠️ NÃO commitar (gitignored)
│   │   └── *.json          # 13 JSONs + imagens
│   ├── uploads/            # Imagens (gitignored)
│   ├── .env                # ⚠️ NÃO commitar (gitignored)
│   ├── .env.example        # Template (commitado)
│   └── package.json
├── docker-compose.yml
├── package.json            # Frontend
└── INSTALACAO_LOCAL.md     # Este arquivo
```

---

## 🆘 Solução de problemas

### Erro: "ECONNREFUSED 127.0.0.1:5432"

O PostgreSQL não está acessível. Se usando Docker:

```powershell
# Verificar se o container está rodando
docker compose ps

# Se não estiver, subir novamente
docker compose up -d postgres

# Verificar se a porta está exposta (descomente "ports" no docker-compose.yml)
```

### Erro: "password authentication failed for user postgres"

```powershell
# Verificar a senha no .env
# Deve corresponder à senha do PostgreSQL
# Se usando Docker, a senha é definida por POSTGRES_PASSWORD no .env
```

### Erro: "relation already exists" ao rodar migrations

O banco já tem dados. Use um banco limpo:

```powershell
# Docker: remover volume e recriar
docker compose down -v
docker compose up -d postgres

# Local: recriar o banco
psql -U postgres -c "DROP DATABASE smoke_bebidas;"
psql -U postgres -c "CREATE DATABASE smoke_bebidas;"
```

### Erro: "Banco já contém dados" ao importar

```powershell
# Limpar todas as tabelas (CUIDADO: apaga tudo)
psql -U postgres -d smoke_bebidas -c "
TRUNCATE deliveries, delivery_reviews, stock_movements, sales, orders,
promotions, coupons, customer_addresses, delivery_drivers, customers,
suppliers, products, store_settings CASCADE;
"
# Depois reexecute: npm run import:backup
``