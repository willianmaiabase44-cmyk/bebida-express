// ============================================================
// stockMovementService.js — MOVIMENTAÇÃO MANUAL DE ESTOQUE
// ============================================================
// POST /api/stock-movements (admin):
//   1. Validar produto existe
//   2. Validar quantity > 0
//   3. Para saída: validar que não deixa estoque negativo
//   4. Atualizar produto e criar StockMovement na MESMA transação
//
// GET /api/stock-movements — lista com filtros (produto, tipo, período)
// ============================================================

import { withTransaction } from '../db/index.js';
import { stockMovementRepository } from '../repositories/stockMovementRepository.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const stockMovementService = {
  // ============================================================
  // POST /api/stock-movements — REGISTRAR MOVIMENTAÇÃO (transação)
  // ============================================================
  async createMovement(data) {
    const { product_id, type, quantity, reason } = data;

    // 1. Validações básicas
    if (!product_id) throw httpError('Produto é obrigatório', 400);
    if (!type || !['entrada', 'saida'].includes(type)) {
      throw httpError('Tipo inválido. Use: entrada ou saida', 400);
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) throw httpError('Quantidade deve ser maior que zero', 400);

    // 2. TRANSAÇÃO ATÔMICA
    return withTransaction(async (client) => {
      // 2a. Lock produto FOR UPDATE
      const { rows: productRows } = await client.query(
        'SELECT * FROM products WHERE id = $1 FOR UPDATE',
        [product_id]
      );
      const product = productRows[0];
      if (!product) throw httpError('Produto não encontrado', 404);

      // 2b. Para saída: validar estoque suficiente
      let newStock;
      if (type === 'entrada') {
        newStock = product.stock + qty;
      } else {
        // saída
        if (product.stock < qty) {
          throw httpError(
            `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`,
            400
          );
        }
        newStock = product.stock - qty;
      }

      // 2c. Atualizar estoque do produto
      await client.query(
        'UPDATE products SET stock = $2 WHERE id = $1',
        [product_id, newStock]
      );

      // 2d. Criar StockMovement
      const today = new Date().toISOString().split('T')[0];
      const movement = await stockMovementRepository.create(
        {
          product_id,
          product_name: product.name,
          type,
          quantity: qty,
          date: today,
          reason: reason || (type === 'entrada' ? 'Entrada manual' : 'Saída manual'),
          stock_after: newStock,
        },
        client
      );

      return movement;
    });
  },

  // ============================================================
  // GET /api/stock-movements — LISTAR (filtros: produto, tipo, período)
  // ============================================================
  async listMovements({ product_id, type, date_from, date_to } = {}) {
    return stockMovementRepository.findAll({
      productId: product_id,
      type,
      dateFrom: date_from,
      dateTo: date_to,
    });
  },

  // ============================================================
  // GET /api/stock-movements/:id — BUSCAR POR ID
  // ============================================================
  async getMovementById(id) {
    const movement = await stockMovementRepository.findById(id);
    if (!movement) throw httpError('Movimentação não encontrada', 404);
    return movement;
  },
};