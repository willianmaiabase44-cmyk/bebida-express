// ============================================================
// orderRepository.js — Acesso a dados da tabela orders
// ============================================================
// Preserva TODOS os campos da entidade Order do Base44.
// O endereço é armazenado em colunas separadas (snapshot) mas
// retornado como objeto `address` para compatibilidade.
// Aceita `client` para operar dentro de transações.
// ============================================================

import { pool } from '../db/index.js';

// Reconstrói o objeto `address` a partir das colunas separadas
function formatOrder(row) {
  if (!row) return null;
  return {
    ...row,
    address: {
      cep: row.address_cep,
      street: row.address_street,
      number: row.address_number,
      complement: row.address_complement,
      district: row.address_district,
      city: row.address_city,
      state: row.address_state,
      reference: row.address_reference,
      full: row.address_full,
    },
  };
}

export const orderRepository = {
  // INSERT — usa nextval('order_number_seq') para número atômico
  async create(data, client = pool) {
    const { rows } = await client.query(
      `INSERT INTO orders (
         customer_id, order_number, customer_name, customer_phone, customer_email,
         address_cep, address_street, address_number, address_complement,
         address_district, address_city, address_state, address_reference, address_full,
         address_lat, address_lng, items, subtotal, distance_km, freight_per_km, freight,
         coupon_code, discount, total, payment_method, change_for, status, channel,
         notes, status_history, date, idempotency_key
       ) VALUES (
         $1, nextval('order_number_seq'), $2, $3, $4,
         $5, $6, $7, $8, $9, $10, $11, $12, $13,
         $14, $15, $16::jsonb, $17, $18, $19, $20,
         $21, $22, $23, $24, $25, $26, $27, $28,
         $29::jsonb, $30, $31
       ) RETURNING *`,
      [
        data.customer_id,
        data.customer_name,
        data.customer_phone,
        data.customer_email || '',
        data.address_cep || null,
        data.address_street || null,
        data.address_number || null,
        data.address_complement || null,
        data.address_district || null,
        data.address_city || null,
        data.address_state || null,
        data.address_reference || null,
        data.address_full || null,
        data.address_lat || null,
        data.address_lng || null,
        JSON.stringify(data.items),
        data.subtotal,
        data.distance_km || null,
        data.freight_per_km || null,
        data.freight,
        data.coupon_code || '',
        data.discount || 0,
        data.total,
        data.payment_method,
        data.change_for || null,
        data.status || 'novo',
        data.channel || 'online',
        data.notes || '',
        JSON.stringify(data.status_history || []),
        data.date,
        data.idempotency_key || null,
      ]
    );
    return formatOrder(rows[0]);
  },

  // Busca pedido por chave de idempotência (para evitar duplicação)
  async findByIdempotencyKey(key, client = pool) {
    if (!key) return null;
    const { rows } = await client.query(
      'SELECT * FROM orders WHERE idempotency_key = $1',
      [key]
    );
    return formatOrder(rows[0]) || null;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
    return formatOrder(rows[0]);
  },

  async findAll({ status, limit = 100, offset = 0, client = pool } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(limit, offset);
    const { rows } = await client.query(
      `SELECT * FROM orders ${where} ORDER BY created_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );
    return rows.map(formatOrder);
  },

  async findByCustomerId(customerId, client = pool) {
    const { rows } = await client.query(
      'SELECT * FROM orders WHERE customer_id = $1 ORDER BY created_date DESC',
      [customerId]
    );
    return rows.map(formatOrder);
  },

  async findByMotoboyId(motoboyId, client = pool) {
    const { rows } = await client.query(
      'SELECT * FROM orders WHERE motoboy_id = $1 ORDER BY created_date DESC',
      [motoboyId]
    );
    return rows.map(formatOrder);
  },
};