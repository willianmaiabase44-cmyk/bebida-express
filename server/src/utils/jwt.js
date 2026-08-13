import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Gera token JWT
// payload pode conter: { id, role, type: 'admin'|'customer'|'motoboy', name, ... }
export function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

// Verifica token JWT
export function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}