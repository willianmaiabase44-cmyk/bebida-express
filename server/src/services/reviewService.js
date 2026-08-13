// ============================================================
// reviewService.js — SERVIÇO DE AVALIAÇÕES DE ENTREGA
// ============================================================
// Criação de avaliação dentro de UMA transação PostgreSQL:
//   1. SELECT ... FOR UPDATE no pedido (lock)
//   2. Validar status = entregue
//   3. Validar ownership do cliente
//   4. Validar motoboy designado
//   5. SELECT ... FOR UPDATE em avaliação existente (lock anti-race)
//   6. INSERT da avaliação
//   7. Recalcular rating do motoboy via AVG SQL atômico
//
// Constraint UNIQUE em delivery_reviews.order_id garante
// que duas avaliações simultâneas nunca passem (última falha
// com 409 ou erro de constraint).
// ============================================================

import { withTransaction } from '../db/index.js';
import { deliveryReviewRepository } from '../repositories/deliveryReviewRepository.js';

function httpError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const reviewService = {
  // ============================================================
  // POST /api/reviews — CRIAR AVALIAÇÃO (transação atômica)
  // ============================================================
  async createReview(data, currentUser) {
    const { order_id, customer_id, rating, comment } = data;

    if (!order_id || !customer_id || !rating) {
      throw httpError('Pedido, cliente e nota são obrigatórios', 400);
    }

    if (rating < 1 || rating > 5) {
      throw httpError('Nota deve ser entre 1 e 5', 400);
    }

    // Ownership: cliente só pode avaliar próprios pedidos
    if (currentUser.type === 'customer' && currentUser.id !== customer_id) {
      throw httpError('Você só pode avaliar seus próprios pedidos', 403);
    }

    return withTransaction(async (client) => {
      // 1. Lock pedido FOR UPDATE
      const { rows: orderRows } = await client.query(
        'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
        [order_id]
      );
      const order = orderRows[0];
      if (!order) throw httpError('Pedido não encontrado', 404);

      // 2. Pedido precisa estar entregue
      if (order.status !== 'entregue') {
        throw httpError('Apenas pedidos entregues podem ser avaliados', 400);
      }

      // 3. Pedido pertence ao cliente
      if (order.customer_id !== customer_id) {
        throw httpError('Este pedido não pertence a você', 403);
      }

      // 4. Motoboy designado
      if (!order.motoboy_id) {
        throw httpError('Este pedido não teve motoboy designado', 400);
      }

      // 5. Verificar avaliação existente (com lock anti-race)
      const { rows: existingRows } = await client.query(
        'SELECT id FROM delivery_reviews WHERE order_id = $1 FOR UPDATE',
        [order_id]
      );
      if (existingRows.length > 0) {
        throw httpError('Este pedido já foi avaliado', 409);
      }

      // 6. Criar avaliação
      const today = new Date().toISOString().split('T')[0];
      const { rows: reviewRows } = await client.query(
        `INSERT INTO delivery_reviews
           (order_id, order_number, customer_id, customer_name, motoboy_id, motoboy_name, rating, comment, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          order_id,
          order.order_number,
          customer_id,
          order.customer_name,
          order.motoboy_id,
          order.motoboy_name,
          rating,
          comment || null,
          today,
        ]
      );
      const review = reviewRows[0];

      // 7. Recalcular rating do motoboy (AVG SQL atômico)
      const { rows: avgRows } = await client.query(
        'SELECT AVG(rating)::numeric(2,1) as avg FROM delivery_reviews WHERE motoboy_id = $1',
        [order.motoboy_id]
      );
      const avg = avgRows[0]?.avg ? parseFloat(avgRows[0].avg) : 5.0;

      await client.query(
        'UPDATE delivery_drivers SET rating = $2 WHERE id = $1',
        [order.motoboy_id, avg]
      );

      return review;
    });
  },

  // ============================================================
  // GET /api/reviews — listar avaliações (admin)
  // ============================================================
  async listReviews(filters) {
    return deliveryReviewRepository.findAll(filters);
  },

  async getReviewById(id) {
    const review = await deliveryReviewRepository.findById(id);
    if (!review) throw httpError('Avaliação não encontrada', 404);
    return review;
  },

  // ============================================================
  // GET /api/motoboys/:id/reviews — avaliações de um motoboy
  // ============================================================
  async getReviewsByMotoboy(motoboyId) {
    return deliveryReviewRepository.findByMotoboyId(motoboyId);
  },
};