import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

// Access Token — curta duração
export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

// Refresh Token — longa duração
export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
}

// Verifica Access Token
export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

// Verifica Refresh Token
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

// Compatibilidade com código existente
export const signToken = signAccessToken;
export const verifyToken = verifyAccessToken;