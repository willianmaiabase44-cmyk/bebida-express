import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Middleware de autenticação JWT
// Extrai o token do header Authorization: Bearer <token>
// Anexa req.user = { id, role, ...payload }
export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// Middleware opcional — não falha se não houver token
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      req.user = jwt.verify(token, config.jwt.secret);
    } catch {
      // ignora token inválido em auth opcional
    }
  }
  next();
}