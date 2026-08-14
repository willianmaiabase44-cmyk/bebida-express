// ============================================================
// saleRepository.js — Acesso a dados da tabela sales (PDV)
// ============================================================
// Campos: items (jsonb), total, payment_method, amount_paid,
// change, channel, status, date.
// Aceita `client` para operar dentro de transações.
// ============================================================

import { pool } from '../db/index.js';

export const saleRepository = {
  // INSERT — cria venda
  async create(data, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO sales (items, total, payment_method, amount_paid, change, channel, status, date)
       VALUES ($1::jsonb, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        JSON.stringify(data.items),
        data.total,
        data.payment_method,
        data.amount_paid || 0,
        data.change || 0,
        data.channel || 'pdv',
        data.status || 'concluida',
        data.date,
      ]
    );
    return rows[0];
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM sales WHERE id = $1', [id]);
    return rows[0] || null;
  },

  // Listagem com filtros opcionais: channel, payment_method, status, date_from, date_to
  async findAll({ channel, paymentMethod, status, dateFrom, dateTo, limit = 500, offset = 0, client = pool } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (channel) {
      conditions.push(`channel = $${idx++}`);
      params.push(channel);
    }
    if (paymentMethod) {
      conditions.push(`payment_method = $${idx++}`);
      params.push(paymentMethod);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (dateFrom) {
      conditions.push(`date >= $${idx++}`);
      params.push(dateFrom);
    }
    if (dateTo) {
      conditions.push(`date <= $${idx++}`);
      params.push(dateTo);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const { rows } = await client.query(
      `SELECT * FROM sales ${where} ORDER BY created_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows;
  },

  // Atualiza status (usado no cancelamento) — atômico com FOR UPDATE
  async findByIdForUpdate(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM sales WHERE id = $1 FOR UPDATE', [id]);
    return rows[0] || null;
  },

  async updateStatus(id, status, client = pool) {
    const { rows } = await client.query(
      'UPDATE sales SET status = $2 WHERE id = $1 RETURNING *',
      [id, status]
    );
    return rows[0] || null;
  },
};