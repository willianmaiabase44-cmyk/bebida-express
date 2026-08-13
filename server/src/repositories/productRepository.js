// ============================================================
// productRepository.js — Acesso a dados da tabela products
// ============================================================
// Preserva TODOS os campos: name, description, category, price,
// cost_price, stock, min_stock, image_url, is_featured, is_new,
// total_sold, active.
// ============================================================

import { pool } from '../db/index.js';

// Campos permitidos para create/update (proteção contra mass-assignment)
const ALLOWED_FIELDS = [
  'name', 'description', 'category', 'price', 'cost_price',
  'stock', 'min_stock', 'image_url', 'is_featured', 'is_new',
  'total_sold', 'active',
];

export const productRepository = {
  async findAll({ category, featured, isNew, includeInactive, client = pool } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (!includeInactive) {
      conditions.push('active = true');
    }
    if (category) {
      conditions.push(`category = $${idx++}`);
      params.push(category);
    }
    if (featured) {
      conditions.push('is_featured = true');
    }
    if (isNew) {
      conditions.push('is_new = true');
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await client.query(
      `SELECT * FROM products ${where} ORDER BY is_featured DESC, name ASC`,
      params
    );
    return rows;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query('SELECT * FROM products WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async create(data, client = pool) {
    const provided = ALLOWED_FIELDS.filter((f) => data[f] !== undefined);
    const values = provided.map((f) => data[f]);
    const placeholders = provided.map((_, i) => `$${i + 1}`).join(', ');
    const columns = provided.join(', ');

    const { rows } = await client.query(
      `INSERT INTO products (${columns}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return rows[0];
  },

  async update(id, data, client = pool) {
    const provided = ALLOWED_FIELDS.filter((f) => data[f] !== undefined);
    if (provided.length === 0) {
      return this.findById(id, client);
    }

    const setClauses = provided.map((f, i) => `${f} = $${i + 1}`);
    const values = provided.map((f) => data[f]);
    values.push(id);

    const { rows } = await client.query(
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return rows[0] || null;
  },

  async delete(id, client = pool) {
    const { rowCount } = await client.query('DELETE FROM products WHERE id = $1', [id]);
    return rowCount > 0;
  },
};