// ============================================================
// importBackup.js — Importador dos 13 JSONs do Base44 para PostgreSQL
// ============================================================
// Estratégia B: Gerar novos UUIDs com mapeamento em memória.
//   - Não altera o schema existente (UUIDs permanecem UUID)
//   - Mapa old_id → new_uuid para resolver FKs
//   - Campos JSONB (items, used_by) têm IDs substituídos quando mapeados
//   - IDs órfãos (produto excluído) são preservados como texto no JSONB
//
// REGRAS:
//   - Não sobrescreve registros existentes (verifica antes de importar)
//   - Roda em transação (rollback em caso de erro)
//   - Preserva datas originais (created_date, updated_date, date)
//   - Preserva histórico de pedidos (status_history, items)
//   - Registra inconsistências em log, não inventa dados
//
// USO:
//   node server/src/db/importBackup.js              # importa
//   node server/src/db/importBackup.js --dry-run    # simula sem gravar
//   node server/src/db/importBackup.js --validate   # apenas valida
// ============================================================

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import pg from 'pg';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.resolve(__dirname, '../../backup');
const REPORT_FILE = path.join(BACKUP_DIR, 'IMPORT_LOG.md');

// Mapa de IDs: idMap[entityName][oldId] = newUuid
const idMap = {
  StoreSettings: {},
  Product: {},
  Supplier: {},
  Customer: {},
  DeliveryDriver: {},
  CustomerAddress: {},
  Coupon: {},
  Promotion: {},
  Order: {},
  Sale: {},
  StockMovement: {},
  DeliveryReview: {},
  Delivery: {},
};

// Acumula inconsistências para o relatório
const inconsistencies = [];
const stats = {};

// ============================================================
// Helpers
// ============================================================

function readJson(name) {
  const filePath = path.join(BACKUP_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function genUuid() {
  return crypto.randomUUID();
}

function mapId(entity, oldId) {
  if (!oldId) return null;
  if (idMap[entity][oldId]) return idMap[entity][oldId];
  return null; // ID órfão — não mapeado
}

function logInconsistency(entity, recordId, message) {
  inconsistencies.push({ entity, recordId, message });
}

// Validação financeira: subtotal + freight - discount ≈ total
function validateFinancial(order) {
  const calcTotal = (Number(order.subtotal) || 0) + (Number(order.freight) || 0) - (Number(order.discount) || 0);
  const actualTotal = Number(order.total) || 0;
  const diff = Math.abs(calcTotal - actualTotal);
  if (diff > 0.01) {
    logInconsistency('Order', order.id, `Divergência financeira: subtotal+freight-discount=${calcTotal.toFixed(2)} vs total=${actualTotal.toFixed(2)} (diff=${diff.toFixed(2)})`);
  }
}

// ============================================================
// Importadores por entidade (em ordem de dependência)
// ============================================================

async function importStoreSettings(client, dryRun) {
  const data = readJson('StoreSettings');
  stats.StoreSettings = { source: data.length, imported: 0, skipped: 0 };
  if (data.length === 0) return;

  for (const r of data) {
    const newId = genUuid();
    idMap.StoreSettings[r.id] = newId;

    if (dryRun) { stats.StoreSettings.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM store_settings WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.StoreSettings.skipped++; continue; }

    await client.query(
      `INSERT INTO store_settings (
        id, store_name, cep, street, number, complement, district, city, state,
        lat, lng, freight_table, freight_per_km, min_freight, free_freight_threshold,
        max_delivery_radius_km, estimated_delivery_minutes, delivery_enabled,
        delivery_city, delivery_state, created_date, updated_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        newId, r.store_name, r.cep, r.street, r.number, r.complement, r.district, r.city, r.state,
        r.lat, r.lng, JSON.stringify(r.freight_table || []), r.freight_per_km, r.min_freight,
        r.free_freight_threshold, r.max_delivery_radius_km, r.estimated_delivery_minutes,
        r.delivery_enabled, r.delivery_city, r.delivery_state, r.created_date, r.updated_date,
      ]
    );
    stats.StoreSettings.imported++;
  }
}

async function importProducts(client, dryRun) {
  const data = readJson('Product');
  stats.Product = { source: data.length, imported: 0, skipped: 0 };
  for (const r of data) {
    const newId = genUuid();
    idMap.Product[r.id] = newId;
    if (dryRun) { stats.Product.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM products WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.Product.skipped++; continue; }

    await client.query(
      `INSERT INTO products (
        id, name, description, category, price, cost_price, stock, min_stock,
        image_url, is_featured, is_new, total_sold, active, created_date, updated_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        newId, r.name, r.description, r.category, r.price, r.cost_price, r.stock, r.min_stock,
        r.image_url, r.is_featured, r.is_new, r.total_sold, r.active, r.created_date, r.updated_date,
      ]
    );
    stats.Product.imported++;
  }
}

async function importSuppliers(client, dryRun) {
  const data = readJson('Supplier');
  stats.Supplier = { source: data.length, imported: 0, skipped: 0 };
  for (const r of data) {
    const newId = genUuid();
    idMap.Supplier[r.id] = newId;
    if (dryRun) { stats.Supplier.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM suppliers WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.Supplier.skipped++; continue; }

    await client.query(
      `INSERT INTO suppliers (id, name, contact_name, phone, email, cnpj, category, address, notes, active, created_date, updated_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [newId, r.name, r.contact_name, r.phone, r.email, r.cnpj, r.category, r.address, r.notes, r.active, r.created_date, r.updated_date]
    );
    stats.Supplier.imported++;
  }
}

async function importCustomers(client, dryRun) {
  const data = readJson('Customer');
  stats.Customer = { source: data.length, imported: 0, skipped: 0 };
  for (const r of data) {
    const newId = genUuid();
    idMap.Customer[r.id] = newId;
    if (dryRun) { stats.Customer.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM customers WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.Customer.skipped++; continue; }

    await client.query(
      `INSERT INTO customers (id, name, phone, email, created_date, updated_date) VALUES ($1,$2,$3,$4,$5,$6)`,
      [newId, r.name, r.phone, r.email, r.created_date, r.updated_date]
    );
    stats.Customer.imported++;
  }
}

async function importDeliveryDrivers(client, dryRun) {
  const data = readJson('DeliveryDriver');
  stats.DeliveryDriver = { source: data.length, imported: 0, skipped: 0 };
  for (const r of data) {
    const newId = genUuid();
    idMap.DeliveryDriver[r.id] = newId;
    if (dryRun) { stats.DeliveryDriver.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM delivery_drivers WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.DeliveryDriver.skipped++; continue; }

    // password_hash e password_salt são preservados (PBKDF2) mas NÃO funcionais
    // Admin deve redefinir senha via painel após importação
    await client.query(
      `INSERT INTO delivery_drivers (
        id, name, phone, login, password_hash, password_salt, vehicle_type, plate,
        status, rating, total_deliveries, active, created_date, updated_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        newId, r.name, r.phone, r.login, r.password_hash, r.password_salt,
        r.vehicle_type, r.plate, r.status, r.rating, r.total_deliveries, r.active,
        r.created_date, r.updated_date,
      ]
    );
    stats.DeliveryDriver.imported++;
  }
  if (data.length > 0) {
    logInconsistency('DeliveryDriver', data[0].id, 'Senha PBKDF2 importada mas incompatível com bcrypt — redefinir via painel admin');
  }
}

async function importCustomerAddresses(client, dryRun) {
  const data = readJson('CustomerAddress');
  stats.CustomerAddress = { source: data.length, imported: 0, skipped: 0, orphan: 0 };
  for (const r of data) {
    const newCustomerId = mapId('Customer', r.customer_id);
    if (!newCustomerId) {
      logInconsistency('CustomerAddress', r.id, `customer_id órfão: ${r.customer_id} — registro pulado`);
      stats.CustomerAddress.orphan++;
      continue;
    }

    const newId = genUuid();
    idMap.CustomerAddress[r.id] = newId;
    if (dryRun) { stats.CustomerAddress.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM customer_addresses WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.CustomerAddress.skipped++; continue; }

    await client.query(
      `INSERT INTO customer_addresses (
        id, customer_id, label, cep, street, number, complement, district, city, state,
        reference, lat, lng, created_date, updated_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        newId, newCustomerId, r.label, r.cep, r.street, r.number, r.complement,
        r.district, r.city, r.state, r.reference, r.lat, r.lng, r.created_date, r.updated_date,
      ]
    );
    stats.CustomerAddress.imported++;
  }
}

async function importCoupons(client, dryRun) {
  const data = readJson('Coupon');
  stats.Coupon = { source: data.length, imported: 0, skipped: 0 };
  for (const r of data) {
    const newId = genUuid();
    idMap.Coupon[r.id] = newId;
    // Substitui customer_ids no array used_by (array de strings, não objetos)
    const finalUsedBy = (r.used_by || []).map(oldId => mapId('Customer', oldId) || oldId);

    if (dryRun) { stats.Coupon.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM coupons WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.Coupon.skipped++; continue; }

    await client.query(
      `INSERT INTO coupons (
        id, code, discount_percent, max_uses, per_customer_limit, min_order_value,
        start_date, end_date, active, used_count, used_by, created_date, updated_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13)`,
      [
        newId, r.code, r.discount_percent, r.max_uses, r.per_customer_limit, r.min_order_value,
        r.start_date, r.end_date, r.active, r.used_count, JSON.stringify(finalUsedBy),
        r.created_date, r.updated_date,
      ]
    );
    stats.Coupon.imported++;
  }
}

async function importPromotions(client, dryRun) {
  const data = readJson('Promotion');
  stats.Promotion = { source: data.length, imported: 0, skipped: 0, orphan: 0 };
  for (const r of data) {
    const newProductId = mapId('Product', r.product_id);
    if (!newProductId) {
      logInconsistency('Promotion', r.id, `product_id órfão: ${r.product_id} (${r.product_name}) — registro pulado`);
      stats.Promotion.orphan++;
      continue;
    }

    const newId = genUuid();
    idMap.Promotion[r.id] = newId;
    if (dryRun) { stats.Promotion.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM promotions WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.Promotion.skipped++; continue; }

    await client.query(
      `INSERT INTO promotions (
        id, product_id, product_name, original_price, promo_price, start_date, end_date,
        banner_url, active, created_date, updated_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        newId, newProductId, r.product_name, r.original_price, r.promo_price,
        r.start_date, r.end_date, r.banner_url, r.active, r.created_date, r.updated_date,
      ]
    );
    stats.Promotion.imported++;
  }
}

async function importOrders(client, dryRun) {
  const data = readJson('Order');
  stats.Order = { source: data.length, imported: 0, skipped: 0, orphanItems: 0 };

  for (const r of data) {
    // Validação financeira
    validateFinancial(r);

    // Mapeia FKs
    const newCustomerId = r.customer_id ? mapId('Customer', r.customer_id) : null;
    const newMotoboyId = r.motoboy_id ? mapId('DeliveryDriver', r.motoboy_id) : null;

    // Se customer_id não mapeia, preserva como NULL (ON DELETE SET NULL)
    // Se motoboy_id não mapeia, preserva como NULL (ON DELETE SET NULL)

    // Substitui product_id nos items (JSONB) — preserva órfãos como texto
    const mappedItems = (r.items || []).map(item => {
      const oldProductId = item.product_id;
      if (!oldProductId) return item;
      const newProductId = mapId('Product', oldProductId);
      if (newProductId) {
        return { ...item, product_id: newProductId };
      }
      // Produto órfão — preserva ID original como texto no JSONB (histórico)
      stats.Order.orphanItems++;
      logInconsistency('Order', r.id, `Item com produto órfão: product_id=${oldProductId} (${item.product_name}) — preservado no histórico`);
      return item;
    });

    const newId = genUuid();
    idMap.Order[r.id] = newId;
    if (dryRun) { stats.Order.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM orders WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.Order.skipped++; continue; }

    const addr = r.address || {};
    await client.query(
      `INSERT INTO orders (
        id, customer_id, order_number, customer_name, customer_phone, customer_email,
        address_cep, address_street, address_number, address_complement, address_district,
        address_city, address_state, address_reference, address_full, address_lat, address_lng,
        items, subtotal, distance_km, freight_per_km, freight, coupon_code, discount, total,
        payment_method, change_for, status, motoboy_id, motoboy_name, motoboy_assigned_at,
        accepted_at, delivered_at, channel, notes, status_history, date, created_date, updated_date
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        $18::jsonb,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36::jsonb,$37,$38,$39
      )`,
      [
        newId, newCustomerId, r.order_number, r.customer_name, r.customer_phone, r.customer_email,
        addr.cep, addr.street, addr.number, addr.complement, addr.district,
        addr.city, addr.state, addr.reference, addr.full, r.address_lat, r.address_lng,
        JSON.stringify(mappedItems), r.subtotal, r.distance_km, r.freight_per_km, r.freight,
        r.coupon_code, r.discount, r.total, r.payment_method, r.change_for, r.status,
        newMotoboyId, r.motoboy_name, r.motoboy_assigned_at, r.accepted_at, r.delivered_at,
        r.channel, r.notes, JSON.stringify(r.status_history || []), r.date, r.created_date, r.updated_date,
      ]
    );
    stats.Order.imported++;
  }
}

async function importSales(client, dryRun) {
  const data = readJson('Sale');
  stats.Sale = { source: data.length, imported: 0, skipped: 0 };
  for (const r of data) {
    // Substitui product_id nos items (JSONB) — preserva órfãos
    const mappedItems = (r.items || []).map(item => {
      const newProductId = item.product_id ? mapId('Product', item.product_id) : null;
      if (item.product_id && !newProductId) {
        logInconsistency('Sale', r.id, `Item com produto órfão: product_id=${item.product_id} (${item.product_name}) — preservado no histórico`);
        return item; // preserva original
      }
      return newProductId ? { ...item, product_id: newProductId } : item;
    });

    const newId = genUuid();
    idMap.Sale[r.id] = newId;
    if (dryRun) { stats.Sale.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM sales WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.Sale.skipped++; continue; }

    await client.query(
      `INSERT INTO sales (id, items, total, payment_method, amount_paid, change, channel, status, date, created_date, updated_date)
       VALUES ($1,$2::jsonb,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [newId, JSON.stringify(mappedItems), r.total, r.payment_method, r.amount_paid, r.change, r.channel, r.status, r.date, r.created_date, r.updated_date]
    );
    stats.Sale.imported++;
  }
}

async function importStockMovements(client, dryRun) {
  const data = readJson('StockMovement');
  stats.StockMovement = { source: data.length, imported: 0, skipped: 0, orphan: 0 };
  for (const r of data) {
    const newProductId = mapId('Product', r.product_id);
    if (!newProductId) {
      logInconsistency('StockMovement', r.id, `product_id órfão: ${r.product_id} (${r.product_name}) — registro pulado`);
      stats.StockMovement.orphan++;
      continue;
    }

    const newId = genUuid();
    idMap.StockMovement[r.id] = newId;
    if (dryRun) { stats.StockMovement.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM stock_movements WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.StockMovement.skipped++; continue; }

    await client.query(
      `INSERT INTO stock_movements (id, product_id, product_name, type, quantity, date, reason, stock_after, created_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [newId, newProductId, r.product_name, r.type, r.quantity, r.date, r.reason, r.stock_after, r.created_date]
    );
    stats.StockMovement.imported++;
  }
}

async function importDeliveryReviews(client, dryRun) {
  const data = readJson('DeliveryReview');
  stats.DeliveryReview = { source: data.length, imported: 0, skipped: 0, orphan: 0 };
  for (const r of data) {
    const newOrderId = mapId('Order', r.order_id);
    const newCustomerId = mapId('Customer', r.customer_id);
    const newMotoboyId = mapId('DeliveryDriver', r.motoboy_id);
    if (!newOrderId || !newCustomerId || !newMotoboyId) {
      logInconsistency('DeliveryReview', r.id, `FK órfã — registro pulado`);
      stats.DeliveryReview.orphan++;
      continue;
    }

    const newId = genUuid();
    idMap.DeliveryReview[r.id] = newId;
    if (dryRun) { stats.DeliveryReview.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM delivery_reviews WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.DeliveryReview.skipped++; continue; }

    await client.query(
      `INSERT INTO delivery_reviews (id, order_id, order_number, customer_id, customer_name, motoboy_id, motoboy_name, rating, comment, date, created_date, updated_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [newId, newOrderId, r.order_number, newCustomerId, r.customer_name, newMotoboyId, r.motoboy_name, r.rating, r.comment, r.date, r.created_date, r.updated_date]
    );
    stats.DeliveryReview.imported++;
  }
}

async function importDeliveries(client, dryRun) {
  const data = readJson('Delivery');
  stats.Delivery = { source: data.length, imported: 0, skipped: 0 };
  for (const r of data) {
    const newMotoboyId = r.motoboy_id ? mapId('DeliveryDriver', r.motoboy_id) : null;
    const newId = genUuid();
    idMap.Delivery[r.id] = newId;
    if (dryRun) { stats.Delivery.imported++; continue; }

    const exists = await client.query('SELECT 1 FROM deliveries WHERE id = $1', [newId]);
    if (exists.rows.length > 0) { stats.Delivery.skipped++; continue; }

    await client.query(
      `INSERT INTO deliveries (id, client_name, client_phone, address, reference, items_description, total, motoboy_id, motoboy_name, status, lat, lng, distance, duration, date, created_date, updated_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [newId, r.client_name, r.client_phone, r.address, r.reference, r.items_description, r.total, newMotoboyId, r.motoboy_name, r.status, r.lat, r.lng, r.distance, r.duration, r.date, r.created_date, r.updated_date]
    );
    stats.Delivery.imported++;
  }
}

// ============================================================
// Reset da sequence order_number_seq
// ============================================================
async function resetOrderSequence(client, dryRun) {
  const { rows } = await client.query('SELECT MAX(order_number) as max FROM orders');
  const maxNum = rows[0]?.max || 1000;
  if (!dryRun) {
    await client.query(`SELECT setval('order_number_seq', $1)`, [maxNum]);
  }
  return maxNum;
}

// ============================================================
// Validações pós-importação
// ============================================================
async function runValidations(client) {
  const results = {};

  // 1. Contagem por tabela
  const tables = ['store_settings', 'products', 'suppliers', 'customers', 'delivery_drivers', 'customer_addresses', 'coupons', 'promotions', 'orders', 'sales', 'stock_movements', 'delivery_reviews', 'deliveries'];
  results.counts = {};
  for (const t of tables) {
    const { rows } = await client.query(`SELECT COUNT(*) as cnt FROM ${t}`);
    results.counts[t] = parseInt(rows[0].cnt, 10);
  }

  // 2. FKs órfãs
  results.fkCheck = {};
  const fkQueries = [
    { name: 'orders_customer', sql: 'SELECT COUNT(*) as cnt FROM orders o LEFT JOIN customers c ON o.customer_id = c.id WHERE o.customer_id IS NOT NULL AND c.id IS NULL' },
    { name: 'orders_motoboy', sql: 'SELECT COUNT(*) as cnt FROM orders o LEFT JOIN delivery_drivers d ON o.motoboy_id = d.id WHERE o.motoboy_id IS NOT NULL AND d.id IS NULL' },
    { name: 'addresses_customer', sql: 'SELECT COUNT(*) as cnt FROM customer_addresses a LEFT JOIN customers c ON a.customer_id = c.id WHERE c.id IS NULL' },
    { name: 'stock_product', sql: 'SELECT COUNT(*) as cnt FROM stock_movements s LEFT JOIN products p ON s.product_id = p.id WHERE p.id IS NULL' },
    { name: 'promo_product', sql: 'SELECT COUNT(*) as cnt FROM promotions pr LEFT JOIN products p ON pr.product_id = p.id WHERE p.id IS NULL' },
  ];
  for (const fq of fkQueries) {
    const { rows } = await client.query(fq.sql);
    results.fkCheck[fq.name] = parseInt(rows[0].cnt, 10);
  }

  // 3. Divergências financeiras em pedidos
  const { rows: finRows } = await client.query(
    `SELECT COUNT(*) as cnt FROM orders WHERE ABS((subtotal + freight - discount) - total) > 0.01`
  );
  results.financialDivergence = parseInt(finRows[0].cnt, 10);

  // 4. StoreSettings singleton
  const { rows: ssRows } = await client.query('SELECT COUNT(*) as cnt FROM store_settings');
  results.storeSettingsCount = parseInt(ssRows[0].cnt, 10);

  return results;
}

// ============================================================
// Geração do relatório
// ============================================================
function generateReport(validations, maxOrderNum) {
  let md = `# 📋 RELATÓRIO DE IMPORTAÇÃO\n\n`;
  md += `**Data:** ${new Date().toISOString()}\n`;
  md += `**Estratégia:** B — Gerar novos UUIDs com mapeamento\n`;
  md += `**Banco:** ${config.database.name}\n\n`;

  md += `## 1. Contagem por Entidade\n\n| Entidade | Source | Imported | Skipped | Orphan |\n|---|---|---|---|---|\n`;
  for (const [name, s] of Object.entries(stats)) {
    md += `| ${name} | ${s.source} | ${s.imported} | ${s.skipped || 0} | ${s.orphan || 0} |\n`;
  }

  md += `\n## 2. Contagem no Banco (validação)\n\n| Tabela | Registros |\n|---|---|\n`;
  for (const [t, c] of Object.entries(validations.counts)) {
    md += `| ${t} | ${c} |\n`;
  }

  md += `\n## 3. Verificação de FKs\n\n| Relacionamento | Órfãos |\n|---|---|\n`;
  for (const [k, v] of Object.entries(validations.fkCheck)) {
    md += `| ${k} | ${v} |\n`;
  }

  md += `\n## 4. Validações Adicionais\n\n`;
  md += `- Divergências financeiras em pedidos: ${validations.financialDivergence}\n`;
  md += `- StoreSettings (esperado 1): ${validations.storeSettingsCount}\n`;
  md += `- Próximo order_number: ${maxOrderNum + 1}\n`;

  if (inconsistencies.length > 0) {
    md += `\n## 5. Inconsistências Registradas (${inconsistencies.length})\n\n`;
    md += `| Entidade | Record ID | Mensagem |\n|---|---|---|\n`;
    for (const inc of inconsistencies) {
      md += `| ${inc.entity} | ${inc.recordId?.substring(0, 12) || 'N/A'}... | ${inc.message} |\n`;
    }
  } else {
    md += `\n## 5. Inconsistências\n\nNenhuma inconsistência registrada.\n`;
  }

  md += `\n## 6. Mapeamento de IDs\n\n`;
  md += `Total de IDs mapeados:\n\n| Entidade | IDs Mapeados |\n|---|---|\n`;
  for (const [name, map] of Object.entries(idMap)) {
    md += `| ${name} | ${Object.keys(map).length} |\n`;
  }

  md += `\n## 7. Ações Pós-Importação\n\n`;
  md += `- [ ] Redefinir senha do motoboy via painel admin (hash PBKDF2 não compatível)\n`;
  md += `- [ ] Criar admin via \`npm run seed\` (não sobrescreve registros importados)\n`;
  md += `- [ ] Copiar logo para \`server/uploads/\`\n`;
  md += `- [ ] Validar API: \`curl http://localhost:4000/api/health\`\n`;

  return md;
}

// ============================================================
// Função principal
// ============================================================
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const validateOnly = args.includes('--validate');

  console.log('='.repeat(60));
  console.log('  IMPORTADOR DE BACKUP — Smoke Bebidas');
  console.log('  Estratégia: B — Gerar novos UUIDs com mapeamento');
  console.log('  ' + (dryRun ? 'MODO: DRY-RUN (simulação)' : validateOnly ? 'MODO: VALIDAÇÃO' : 'MODO: IMPORTAÇÃO'));
  console.log('='.repeat(60));

  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`❌ Diretório de backup não encontrado: ${BACKUP_DIR}`);
    process.exit(1);
  }

  const poolConfig = config.database.connectionString
    ? { connectionString: config.database.connectionString }
    : {
        host: config.database.host,
        port: config.database.port,
        database: config.database.name,
        user: config.database.user,
        password: config.database.password,
      };

  const client = new pg.Client(poolConfig);

  try {
    await client.connect();
    console.log('🔗 Conectado ao PostgreSQL:', config.database.name);

    if (validateOnly) {
      console.log('\n🔍 Executando validações...');
      const validations = await runValidations(client);
      console.log('\n📊 Resultado:');
      console.log(JSON.stringify(validations, null, 2));
      return;
    }

    // Verifica se já existem dados (idempotência) — checa múltiplas tabelas-chave
    if (!dryRun) {
      const { rows: existing } = await client.query(`
        SELECT
          (SELECT COUNT(*) FROM store_settings) as ss,
          (SELECT COUNT(*) FROM products) as prod,
          (SELECT COUNT(*) FROM orders) as ord,
          (SELECT COUNT(*) FROM customers) as cust
      `);
      const total = parseInt(existing[0].ss, 10) + parseInt(existing[0].prod, 10)
        + parseInt(existing[0].ord, 10) + parseInt(existing[0].cust, 10);
      if (total > 0) {
        console.log(`⚠️  Banco já contém dados (${total} registros em tabelas-chave).`);
        console.log('   Use --dry-run para simular, ou limpe o banco antes de importar.');
        console.log('   Para limpar: TRUNCATE todas as tabelas em ordem reversa de dependência.');
        process.exit(1);
      }
    }

    await client.query('BEGIN');
    console.log('\n📦 Importando em ordem de dependência...\n');

    try {
      // Ordem de dependência
      await importStoreSettings(client, dryRun);
      console.log(`  ✅ StoreSettings: ${stats.StoreSettings.imported}/${stats.StoreSettings.source}`);
      await importProducts(client, dryRun);
      console.log(`  ✅ Product: ${stats.Product.imported}/${stats.Product.source}`);
      await importSuppliers(client, dryRun);
      console.log(`  ✅ Supplier: ${stats.Supplier.imported}/${stats.Supplier.source}`);
      await importCustomers(client, dryRun);
      console.log(`  ✅ Customer: ${stats.Customer.imported}/${stats.Customer.source}`);
      await importDeliveryDrivers(client, dryRun);
      console.log(`  ✅ DeliveryDriver: ${stats.DeliveryDriver.imported}/${stats.DeliveryDriver.source}`);
      await importCustomerAddresses(client, dryRun);
      console.log(`  ✅ CustomerAddress: ${stats.CustomerAddress.imported}/${stats.CustomerAddress.source}`);
      await importCoupons(client, dryRun);
      console.log(`  ✅ Coupon: ${stats.Coupon.imported}/${stats.Coupon.source}`);
      await importPromotions(client, dryRun);
      console.log(`  ✅ Promotion: ${stats.Promotion.imported}/${stats.Promotion.source}`);
      await importOrders(client, dryRun);
      console.log(`  ✅ Order: ${stats.Order.imported}/${stats.Order.source} (itens órfãos: ${stats.Order.orphanItems})`);
      await importSales(client, dryRun);
      console.log(`  ✅ Sale: ${stats.Sale.imported}/${stats.Sale.source}`);
      await importStockMovements(client, dryRun);
      console.log(`  ✅ StockMovement: ${stats.StockMovement.imported}/${stats.StockMovement.source} (órfãos: ${stats.StockMovement.orphan})`);
      await importDeliveryReviews(client, dryRun);
      console.log(`  ✅ DeliveryReview: ${stats.DeliveryReview.imported}/${stats.DeliveryReview.source}`);
      await importDeliveries(client, dryRun);
      console.log(`  ✅ Delivery: ${stats.Delivery.imported}/${stats.Delivery.source}`);

      // Reset da sequence
      const maxOrderNum = await resetOrderSequence(client, dryRun);
      console.log(`\n🔄 Sequence order_number_seq resetada para ${maxOrderNum}`);

      // Validações
      console.log('\n🔍 Executando validações...');
      const validations = await runValidations(client);

      if (dryRun) {
        await client.query('ROLLBACK');
        console.log('\n🔄 DRY-RUN: Transação revertida (nenhum dado gravado)');
      } else {
        await client.query('COMMIT');
        console.log('\n✅ Transação commitada com sucesso!');
      }

      // Gera relatório
      const report = generateReport(validations, maxOrderNum);
      fs.writeFileSync(REPORT_FILE, report, 'utf-8');
      console.log(`\n📄 Relatório salvo: ${REPORT_FILE}`);

      // Resumo
      console.log('\n' + '='.repeat(60));
      console.log('  RESUMO DA IMPORTAÇÃO');
      console.log('='.repeat(60));
      let totalSource = 0, totalImported = 0;
      for (const [name, s] of Object.entries(stats)) {
        totalSource += s.source;
        totalImported += s.imported;
      }
      console.log(`  Total source: ${totalSource} registros`);
      console.log(`  Total importado: ${totalImported} registros`);
      console.log(`  Inconsistências: ${inconsistencies.length}`);
      console.log(`  FKs órfãs: ${Object.values(validations.fkCheck).reduce((a, b) => a + b, 0)}`);
      console.log(`  Divergências financeiras: ${validations.financialDivergence}`);
      console.log('='.repeat(60));

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('\n❌ Erro durante importação — transação revertida:', err.message);
      throw err;
    }

  } catch (err) {
    console.error('\n❌ Falha:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();