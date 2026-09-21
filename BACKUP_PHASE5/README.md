# BACKUP — FASE 5 (Estado Anterior à Fase 6)

Este diretório documenta o estado do projeto ANTES da Fase 6 (remoção de dependências Base44).

## Arquivos Preservados

Os arquivos originais foram modificados in-place durante a Fase 6. As versões
originais estão preservadas no histórico de versões da plataforma Base44.

## Alterações da Fase 6 (aplicadas in-place)

| Arquivo | Alteração |
|---|---|
| `src/components/store/StoreHeader.jsx` | URL do logo: CDN Base44 → `/logo.png` local |
| `src/components/admin/AdminLayout.jsx` | URL do logo: CDN Base44 → `/logo.png` local |
| `index.html` | Favicon: `base44.com/logo_v2.svg` → `/logo.png` local |
| `package.json` | Nome: `base44-app` → `smoke-bebidas` |
| `src/lib/AuthContext.jsx` | Comentário atualizado (removida referência ao base44) |
| `public/logo.png` | Logo original baixado do CDN Base44 (182KB) |

## Arquivos `.local` Criados (para Trae IDE)

Estes arquivos NÃO substituem os originais no ambiente Base44. Eles devem ser
aplicados manualmente no Trae IDE conforme o `EXPORT_GUIDE.md`.

| Arquivo | Descrição |
|---|---|
| `vite.config.local.js` | Vite config sem `@base44/vite-plugin` |
| `package.local.json` | package.json sem `@base44/sdk` e `@base44/vite-plugin` |
| `src/api/base44Client.local.js` | Stub vazio (SDK removido) |
| `src/lib/AuthContext.local.jsx` | AuthContext sem import do `base44` |
| `src/lib/app-params.local.js` | app-params sem `VITE_BASE44_*` env vars |

## Por que não remover as dependências in-place?

A plataforma Base44 exige:
1. `@base44/vite-plugin` em `vite.config.js` — sem ele, o build quebra no editor Base44
2. `import { base44 }` em `AuthContext.jsx` — sem ele, a validação da plataforma falha
3. `base44Client.js` com `createClient` — exigido pelo scaffold da plataforma

Remover estas dependências in-place comprometeria o funcionamento do editor Base44.
As alterações estão preparadas como arquivos `.local` para aplicação no Trae IDE.