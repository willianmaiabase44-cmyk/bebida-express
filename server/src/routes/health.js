import { Router } from 'express';
import { testConnection } from '../db/index.js';

const router = Router();

// GET /api/health — testa conexão real com PostgreSQL
router.get('/', async (req, res) => {
  const db = await testConnection();
  res.json({
    ok: db.ok,
    database: db.ok ? 'connected' : 'disconnected',
    timestamp: db.timestamp || null,
    error: db.ok ? undefined : db.error,
  });
});

export default router;