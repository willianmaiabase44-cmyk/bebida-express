// ============================================================
// Repositórios — camada de acesso a dados (a implementar Etapa 2)
// ============================================================
// Cada repositório encapsula queries SQL de uma entidade.
// Os services chamam os repositórios — controllers chamam os services.
//
// Padrão a seguir:
//
//   export const productRepository = {
//     findAll: async (client = pool) => { ... },
//     findById: async (id, client = pool) => { ... },
//     create: async (data, client = pool) => { ... },
//     update: async (id, data, client = pool) => { ... },
//     delete: async (id, client = pool) => { ... },
//   };
//
// O parâmetro `client` permite reutilizar a mesma conexão dentro de
// transações (withTransaction passa o client da transação).
// ============================================================

// STATUS: PENDENTE — Etapa 2