// ============================================================
// reportService.js — RELATÓRIOS GERENCIAIS
// ============================================================
// Endpoints:
//   GET /api/reports/dashboard
//   GET /api/reports/sales
//   GET /api/reports/products
//   GET /api/reports/stock
//   GET /api/reports/orders
//   GET /api/reports/customers
//   GET /api/reports/deliveries
//
// Filtros: date_from, date_to, channel, payment_method, status
// SQL agregado via PostgreSQL. Apenas admin.
// ============================================================

import { pool } from '../db/index.js';

function buildDateFilter(dateFrom, dateTo, column = 'date') {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (dateFrom) {
    conditions.push(`${column} >= $${idx++}`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`${column} <= $${idx++}`);
    params.push(dateTo);
  }
  return { where: conditions.length > 0 ? conditions.join(' AND ') : 'TRUE', params, idx };
}

export const reportService = {
  // ============================================================
  // GET /api/reports/dashboard
  // ============================================================
  async dashboard({ date_from, date_to } = {}) {
    const today = new Date().toISOString().split('T')[0];
    const { where: dateWhere, params: dateParams } = buildDateFilter(date_from, date_to);

    // --- Vendas do dia (PDV + Online) ---
    const salesToday = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'concluida' THEN total END), 0) AS total,
         COUNT(*) FILTER (WHERE status = 'concluida') AS count
       FROM sales WHERE date = $1`,
      [today]
    );
    const ordersToday = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total END), 0) AS total,
         COUNT(*) FILTER (WHERE status != 'cancelado') AS count
       FROM orders WHERE date = $1`,
      [today]
    );

    // --- Vendas do período (PDV) ---
    const salesPeriod = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'concluida' THEN total END), 0) AS total,
         COUNT(*) FILTER (WHERE status = 'concluida') AS count
       FROM sales WHERE ${dateWhere}`,
      dateParams
    );

    // --- Pedidos online do período ---
    const ordersPeriod = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total END), 0) AS total,
         COUNT(*) FILTER (WHERE status != 'cancelado') AS count
       FROM orders WHERE ${dateWhere}`,
      dateParams
    );

    // --- Faturamento (PDV concluídas + online não canceladas) ---
    const pdvRevenue = Number(salesPeriod.rows[0].total) || 0;
    const onlineRevenue = Number(ordersPeriod.rows[0].total) || 0;
    const totalRevenue = pdvRevenue + onlineRevenue;

    const pdvCount = Number(salesPeriod.rows[0].count) || 0;
    const onlineCount = Number(ordersPeriod.rows[0].count) || 0;
    const totalCount = pdvCount + onlineCount;

    const avgTicket = totalCount > 0 ? Math.round((totalRevenue / totalCount) * 100) / 100 : 0;

    // --- Produtos com estoque baixo (stock <= min_stock) ---
    const lowStock = await pool.query(
      `SELECT id, name, stock, min_stock, category FROM products
       WHERE active = true AND stock <= min_stock ORDER BY stock ASC`
    );

    // --- Produtos sem estoque ---
    const noStock = await pool.query(
      `SELECT id, name, stock FROM products WHERE active = true AND stock <= 0 ORDER BY name`
    );

    // --- Produtos mais vendidos ---
    const topProducts = await pool.query(
      `SELECT id, name, total_sold, price, category FROM products
       WHERE total_sold > 0 ORDER BY total_sold DESC LIMIT 10`
    );

    // --- Vendas por forma de pagamento (PDV) ---
    const salesByPayment = await pool.query(
      `SELECT payment_method,
              COUNT(*) AS count,
              COALESCE(SUM(CASE WHEN status = 'concluida' THEN total END), 0) AS total
       FROM sales WHERE ${dateWhere}
       GROUP BY payment_method ORDER BY total DESC`,
      dateParams
    );

    // --- Pedidos por forma de pagamento (online) ---
    const ordersByPayment = await pool.query(
      `SELECT payment_method,
              COUNT(*) AS count,
              COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total END), 0) AS total
       FROM orders WHERE ${dateWhere}
       GROUP BY payment_method ORDER BY total DESC`,
      dateParams
    );

    // --- Vendas por canal ---
    const byChannel = {
      pdv: { count: pdvCount, total: Math.round(pdvRevenue * 100) / 100 },
      online: { count: onlineCount, total: Math.round(onlineRevenue * 100) / 100 },
    };

    // --- Pedidos por status ---
    const ordersByStatus = await pool.query(
      `SELECT status, COUNT(*) AS count FROM orders WHERE ${dateWhere} GROUP BY status ORDER BY count DESC`,
      dateParams
    );

    return {
      today: {
        sales_total: Number(salesToday.rows[0].total) || 0,
        sales_count: Number(salesToday.rows[0].count) || 0,
        orders_total: Number(ordersToday.rows[0].total) || 0,
        orders_count: Number(ordersToday.rows[0].count) || 0,
      },
      period: {
        pdv_revenue: Math.round(pdvRevenue * 100) / 100,
        online_revenue: Math.round(onlineRevenue * 100) / 100,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        pdv_count: pdvCount,
        online_count: onlineCount,
        total_count: totalCount,
        avg_ticket: avgTicket,
      },
      low_stock: lowStock.rows.map((r) => ({
        ...r,
        stock: Number(r.stock),
        min_stock: Number(r.min_stock),
      })),
      no_stock: noStock.rows.map((r) => ({ ...r, stock: Number(r.stock) })),
      top_products: topProducts.rows.map((r) => ({
        ...r,
        total_sold: Number(r.total_sold),
        price: Number(r.price),
      })),
      sales_by_payment_method: salesByPayment.rows.map((r) => ({
        payment_method: r.payment_method,
        count: Number(r.count),
        total: Number(r.total),
      })),
      orders_by_payment_method: ordersByPayment.rows.map((r) => ({
        payment_method: r.payment_method,
        count: Number(r.count),
        total: Number(r.total),
      })),
      by_channel: byChannel,
      orders_by_status: ordersByStatus.rows.map((r) => ({
        status: r.status,
        count: Number(r.count),
      })),
    };
  },

  // ============================================================
  // GET /api/reports/sales — relatório de vendas (PDV)
  // ============================================================
  async salesReport({ date_from, date_to, channel, payment_method, status } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (channel) { conditions.push(`channel = $${idx++}`); params.push(channel); }
    if (payment_method) { conditions.push(`payment_method = $${idx++}`); params.push(payment_method); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (date_from) { conditions.push(`date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`date <= $${idx++}`); params.push(date_to); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT * FROM sales ${where} ORDER BY date DESC, created_date DESC`,
      params
    );

    const summary = await pool.query(
      `SELECT
         COUNT(*) AS count,
         COUNT(*) FILTER (WHERE status = 'concluida') AS concluded_count,
         COUNT(*) FILTER (WHERE status = 'cancelada') AS cancelled_count,
         COALESCE(SUM(CASE WHEN status = 'concluida' THEN total END), 0) AS total_revenue,
         COALESCE(SUM(CASE WHEN status = 'concluida' THEN total END), 0) / NULLIF(COUNT(*) FILTER (WHERE status = 'concluida'), 0) AS avg_ticket
       FROM sales ${where}`,
      params
    );

    return {
      items: rows.map((r) => ({
        ...r,
        total: Number(r.total),
        amount_paid: Number(r.amount_paid),
        change: Number(r.change),
      })),
      summary: {
        count: Number(summary.rows[0].count),
        concluded_count: Number(summary.rows[0].concluded_count),
        cancelled_count: Number(summary.rows[0].cancelled_count),
        total_revenue: Number(summary.rows[0].total_revenue),
        avg_ticket: summary.rows[0].avg_ticket ? Math.round(Number(summary.rows[0].avg_ticket) * 100) / 100 : 0,
      },
    };
  },

  // ============================================================
  // GET /api/reports/products — relatório de produtos
  // ============================================================
  async productsReport() {
    const { rows } = await pool.query(
      `SELECT id, name, category, price, cost_price, stock, min_stock, total_sold, active,
              (stock * COALESCE(cost_price, 0)) AS stock_value
       FROM products ORDER BY total_sold DESC, name ASC`
    );

    const summary = await pool.query(
      `SELECT
         COUNT(*) AS total_products,
         COUNT(*) FILTER (WHERE active = true) AS active_products,
         COALESCE(SUM(stock * COALESCE(cost_price, 0)), 0) AS total_stock_value,
         COUNT(*) FILTER (WHERE active = true AND stock <= min_stock) AS low_stock_count,
         COUNT(*) FILTER (WHERE active = true AND stock <= 0) AS no_stock_count,
         COALESCE(SUM(total_sold), 0) AS total_units_sold
       FROM products`
    );

    return {
      items: rows.map((r) => ({
        ...r,
        price: Number(r.price),
        cost_price: r.cost_price ? Number(r.cost_price) : null,
        stock: Number(r.stock),
        min_stock: Number(r.min_stock),
        total_sold: Number(r.total_sold),
        stock_value: Number(r.stock_value),
      })),
      summary: {
        total_products: Number(summary.rows[0].total_products),
        active_products: Number(summary.rows[0].active_products),
        total_stock_value: Number(summary.rows[0].total_stock_value),
        low_stock_count: Number(summary.rows[0].low_stock_count),
        no_stock_count: Number(summary.rows[0].no_stock_count),
        total_units_sold: Number(summary.rows[0].total_units_sold),
      },
    };
  },

  // ============================================================
  // GET /api/reports/stock — relatório de movimentações de estoque
  // ============================================================
  async stockReport({ product_id, type, date_from, date_to } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (product_id) { conditions.push(`product_id = $${idx++}`); params.push(product_id); }
    if (type) { conditions.push(`type = $${idx++}`); params.push(type); }
    if (date_from) { conditions.push(`date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`date <= $${idx++}`); params.push(date_to); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT * FROM stock_movements ${where} ORDER BY created_date DESC LIMIT 1000`,
      params
    );

    const summary = await pool.query(
      `SELECT
         COUNT(*) AS total_movements,
         COUNT(*) FILTER (WHERE type = 'entrada') AS entries,
         COUNT(*) FILTER (WHERE type = 'saida') AS exits,
         COALESCE(SUM(quantity) FILTER (WHERE type = 'entrada'), 0) AS total_in,
         COALESCE(SUM(quantity) FILTER (WHERE type = 'saida'), 0) AS total_out
       FROM stock_movements ${where}`,
      params
    );

    return {
      items: rows.map((r) => ({
        ...r,
        quantity: Number(r.quantity),
        stock_after: r.stock_after !== null ? Number(r.stock_after) : null,
      })),
      summary: {
        total_movements: Number(summary.rows[0].total_movements),
        entries: Number(summary.rows[0].entries),
        exits: Number(summary.rows[0].exits),
        total_in: Number(summary.rows[0].total_in),
        total_out: Number(summary.rows[0].total_out),
      },
    };
  },

  // ============================================================
  // GET /api/reports/orders — relatório de pedidos online
  // ============================================================
  async ordersReport({ date_from, date_to, channel, payment_method, status } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (channel) { conditions.push(`channel = $${idx++}`); params.push(channel); }
    if (payment_method) { conditions.push(`payment_method = $${idx++}`); params.push(payment_method); }
    if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
    if (date_from) { conditions.push(`date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`date <= $${idx++}`); params.push(date_to); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT id, order_number, customer_name, customer_phone, total, subtotal, freight, discount,
              payment_method, status, channel, date, motoboy_name
       FROM orders ${where} ORDER BY date DESC, created_date DESC`,
      params
    );

    const summary = await pool.query(
      `SELECT
         COUNT(*) AS count,
         COUNT(*) FILTER (WHERE status = 'entregue') AS delivered_count,
         COUNT(*) FILTER (WHERE status = 'cancelado') AS cancelled_count,
         COALESCE(SUM(CASE WHEN status != 'cancelado' THEN total END), 0) AS total_revenue,
         COALESCE(SUM(freight) FILTER (WHERE status != 'cancelado'), 0) AS total_freight,
         COALESCE(SUM(discount) FILTER (WHERE status != 'cancelado'), 0) AS total_discount
       FROM orders ${where}`,
      params
    );

    return {
      items: rows.map((r) => ({
        ...r,
        total: Number(r.total),
        subtotal: Number(r.subtotal),
        freight: Number(r.freight),
        discount: Number(r.discount),
      })),
      summary: {
        count: Number(summary.rows[0].count),
        delivered_count: Number(summary.rows[0].delivered_count),
        cancelled_count: Number(summary.rows[0].cancelled_count),
        total_revenue: Number(summary.rows[0].total_revenue),
        total_freight: Number(summary.rows[0].total_freight),
        total_discount: Number(summary.rows[0].total_discount),
      },
    };
  },

  // ============================================================
  // GET /api/reports/customers — relatório de clientes
  // ============================================================
  async customersReport() {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.phone, c.email, c.created_date,
              COUNT(DISTINCT o.id) AS order_count,
              COALESCE(SUM(CASE WHEN o.status != 'cancelado' THEN o.total END), 0) AS total_spent
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id
       GROUP BY c.id, c.name, c.phone, c.email, c.created_date
       ORDER BY total_spent DESC, order_count DESC`
    );

    const summary = await pool.query(
      `SELECT
         COUNT(*) AS total_customers,
         COUNT(*) FILTER (WHERE order_count > 0) AS customers_with_orders,
         COALESCE(AVG(total_spent) FILTER (WHERE order_count > 0), 0) AS avg_spent
       FROM (
         SELECT c.id, COUNT(DISTINCT o.id) AS order_count,
                COALESCE(SUM(CASE WHEN o.status != 'cancelado' THEN o.total END), 0) AS total_spent
         FROM customers c
         LEFT JOIN orders o ON o.customer_id = c.id
         GROUP BY c.id
       ) sub`
    );

    return {
      items: rows.map((r) => ({
        ...r,
        order_count: Number(r.order_count),
        total_spent: Number(r.total_spent),
      })),
      summary: {
        total_customers: Number(summary.rows[0].total_customers),
        customers_with_orders: Number(summary.rows[0].customers_with_orders),
        avg_spent: Math.round(Number(summary.rows[0].avg_spent) * 100) / 100,
      },
    };
  },

  // ============================================================
  // GET /api/reports/deliveries — relatório de entregas
  // ============================================================
  async deliveriesReport({ date_from, date_to, status } = {}) {
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`d.status = $${idx++}`); params.push(status); }
    if (date_from) { conditions.push(`d.date >= $${idx++}`); params.push(date_from); }
    if (date_to) { conditions.push(`d.date <= $${idx++}`); params.push(date_to); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT d.id, d.client_name, d.client_phone, d.address, d.total, d.status,
              d.motoboy_name, d.distance, d.duration, d.date
       FROM deliveries d ${where} ORDER BY d.date DESC, d.created_date DESC`,
      params
    );

    const summary = await pool.query(
      `SELECT
         COUNT(*) AS count,
         COUNT(*) FILTER (WHERE status = 'entregue') AS delivered_count,
         COUNT(*) FILTER (WHERE status = 'cancelada') AS cancelled_count,
         COUNT(*) FILTER (WHERE status = 'pendente') AS pending_count,
         COUNT(*) FILTER (WHERE status = 'em_rota') AS in_route_count,
         COALESCE(SUM(total) FILTER (WHERE status = 'entregue'), 0) AS total_delivered_value
       FROM deliveries d ${where}`,
      params
    );

    return {
      items: rows.map((r) => ({
        ...r,
        total: Number(r.total),
      })),
      summary: {
        count: Number(summary.rows[0].count),
        delivered_count: Number(summary.rows[0].delivered_count),
        cancelled_count: Number(summary.rows[0].cancelled_count),
        pending_count: Number(summary.rows[0].pending_count),
        in_route_count: Number(summary.rows[0].in_route_count),
        total_delivered_value: Number(summary.rows[0].total_delivered_value),
      },
    };
  },
};