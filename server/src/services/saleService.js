// ============================================================
// saleService.js — SERVIÇO DE VENDAS PDV (TRANSAÇÃO ATÔMICA)
// ============================================================
// POST /api/sales (venda PDV):
//   1. SELECT ... FOR UPDATE nos produtos (lock de estoque)
//   2. Recalcular preços usando products.price (ignora frontend)
//   3. Validar estoque disponível (com lock ativo)
//   4. Criar Sale
//   5. Baixar estoque (UPDATE products SET stock = stock - qty)
//   6. Criar StockMovement (saida) para cada item
//   7. Incrementar total_sold dos produtos
//
// PATCH /api/sales/:id/cancel (cancelamento):
//   1. SELECT ... FOR UPDATE na venda (lock)
//   2. Validar que não está cancelada
//   3. Alterar status para cancelada
//   4. Devolver quantidades ao estoque
//   5. Criar StockMovement (entrada) para cada item
//   6. Decrementar total_sold dos produtos
//
// Em caso de qualquer erro: ROLLBACK automático.
// ============================================================

import { withTransaction } from '../db/index.js';
import { saleRepository } from '../repositories/saleRepository.js';
import { stockMovementRepository } from '../repositories/stockMovementRepository.js';

const VALID_PAYMENT_METHODS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'];

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const saleService = {
  // ============================================================
  // POST /api/sales — REGISTRAR VENDA PDV (transação atômica)
  // ============================================================
  async createSale(data) {
    const { items, payment_method, amount_paid, change, channel } = data;

    // 1. Validações básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw httpError('Carrinho vazio', 400);
    }
    if (!payment_method) throw httpError('Forma de pagamento obrigatória', 400);
    if (!VALID_PAYMENT_METHODS.includes(payment_method)) {
      throw httpError(`Forma de pagamento inválida. Use: ${VALID_PAYMENT_METHODS.join(', ')}`, 400);
    }

    // 2. TRANSAÇÃO ATÔMICA
    return withTransaction(async (client) => {
      // 2a. Lock produtos FOR UPDATE
      const productIds = items.filter((i) => i.product_id).map((i) => i.product_id);
      if (productIds.length === 0) throw httpError('Nenhum produto válido no carrinho', 400);

      const { rows: products } = await client.query(
        'SELECT * FROM products WHERE id = ANY($1) FOR UPDATE',
        [productIds]
      );

      // 2b. Validar produtos e recalcular preços (NÃO confia no frontend)
      const validatedItems = [];
      let total = 0;
      const stockUpdates = [];

      for (const item of items) {
        const product = products.find((p) => p.id === item.product_id);
        if (!product) {
          throw httpError(`Produto não encontrado: ${item.product_name || item.product_id}`, 400);
        }
        if (!product.active) {
          throw httpError(`Produto indisponível: ${product.name}`, 400);
        }
        const quantity = Number(item.quantity);
        if (!quantity || quantity <= 0) {
          throw httpError('Quantidade inválida', 400);
        }
        if (product.stock < quantity) {
          throw httpError(
            `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`,
            400
          );
        }

        // Preço vem SEMPRE do banco — ignora item.price do frontend
        const lineTotal = Number(product.price) * quantity;
        total += lineTotal;

        validatedItems.push({
          product_id: product.id,
          product_name: product.name,
          price: Number(product.price),
          quantity,
        });

        stockUpdates.push({
          id: product.id,
          product_name: product.name,
          quantity,
        });
      }

      total = Math.round(total * 100) / 100;

      // 2c. Criar venda
      const today = new Date().toISOString().split('T')[0];
      const sale = await saleRepository.create(
        {
          items: validatedItems,
          total,
          payment_method,
          amount_paid: amount_paid || 0,
          change: change || 0,
          channel: channel || 'pdv',
          status: 'concluida',
          date: today,
        },
        client
      );

      // 2d. Baixar estoque + StockMovement + total_sold
      for (const su of stockUpdates) {
        const { rows: [updatedProduct] } = await client.query(
          'UPDATE products SET stock = stock - $1, total_sold = total_sold + $1 WHERE id = $2 RETURNING *',
          [su.quantity, su.id]
        );

        await stockMovementRepository.create(
          {
            product_id: su.id,
            product_name: su.product_name,
            type: 'saida',
            quantity: su.quantity,
            date: today,
            reason: `Venda PDV #${sale.id.substring(0, 8)}`,
            stock_after: updatedProduct.stock,
          },
          client
        );
      }

      return sale;
    });
  },

  // ============================================================
  // GET /api/sales — LISTAR VENDAS (admin)
  // ============================================================
  async listSales({ channel, payment_method, status, date_from, date_to } = {}) {
    return saleRepository.findAll({
      channel,
      paymentMethod: payment_method,
      status,
      dateFrom: date_from,
      dateTo: date_to,
    });
  },

  // ============================================================
  // GET /api/sales/:id — BUSCAR VENDA POR ID (admin)
  // ============================================================
  async getSaleById(id) {
    const sale = await saleRepository.findById(id);
    if (!sale) throw httpError('Venda não encontrada', 404);
    return sale;
  },

  // ============================================================
  // PATCH /api/sales/:id/cancel — CANCELAR VENDA (transação atômica)
  // ============================================================
  async cancelSale(id) {
    return withTransaction(async (client) => {
      // 1. Lock venda FOR UPDATE
      const sale = await saleRepository.findByIdForUpdate(id, client);
      if (!sale) throw httpError('Venda não encontrada', 404);

      // 2. Validar que ainda não está cancelada
      if (sale.status === 'cancelada') {
        throw httpError('Venda já está cancelada', 400);
      }

      // 3. Alterar status para cancelada
      await saleRepository.updateStatus(id, 'cancelada', client);

      // 4. Devolver quantidades ao estoque + StockMovement (entrada) + decrementar total_sold
      const items = Array.isArray(sale.items) ? sale.items : [];
      const today = new Date().toISOString().split('T')[0];

      for (const item of items) {
        const { rows: [updatedProduct] } = await client.query(
          'UPDATE products SET stock = stock + $1, total_sold = total_sold - $1 WHERE id = $2 RETURNING *',
          [item.quantity, item.product_id]
        );

        await stockMovementRepository.create(
          {
            product_id: item.product_id,
            product_name: item.product_name,
            type: 'entrada',
            quantity: item.quantity,
            date: today,
            reason: `Cancelamento venda #${sale.id.substring(0, 8)}`,
            stock_after: updatedProduct ? updatedProduct.stock : null,
          },
          client
        );
      }

      return { success: true, id: sale.id, status: 'cancelada' };
    });
  },
};