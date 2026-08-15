// ============================================================
// authController.js — Handlers HTTP de autenticação
// ============================================================
// Controllers são finos: extraem dados da req, chamam services,
// formatam a res. Regras de negócio ficam nos services.
// ============================================================

import * as authService from '../services/authService.js';

// POST /api/auth/admin/login
export function loginAdmin(req, res, next) {
  authService
    .loginAdmin(req.body.email, req.body.password)
    .then((result) => res.json(result))
    .catch(next);
}

// POST /api/auth/customer
export function loginCustomer(req, res, next) {
  authService
    .loginCustomer(req.body.phone, req.body.name, req.body.address)
    .then((result) => res.json(result))
    .catch(next);
}

// POST /api/auth/motoboy
export function loginMotoboy(req, res, next) {
  authService
    .loginMotoboy(req.body.login, req.body.password)
    .then((result) => res.json(result))
    .catch(next);
}

// GET /api/auth/me — req.user é setado pelo authMiddleware
export function getMe(req, res, next) {
  authService
    .getMe(req.user)
    .then((result) => res.json(result))
    .catch(next);
}

// POST /api/auth/refresh — renova access token
export function refresh(req, res, next) {
  authService
    .refreshAccessToken(req.body.refresh_token)
    .then((result) => res.json(result))
    .catch(next);
}

// POST /api/auth/logout — revoga refresh tokens (req.user do authMiddleware)
export function logout(req, res, next) {
  const refreshToken = req.body?.refresh_token;
  authService
    .logoutUser(req.user, refreshToken)
    .then((result) => res.json(result))
    .catch(next);
}