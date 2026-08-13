// ============================================================
// storeSettingsController.js — Handlers HTTP de configurações
// ============================================================
// GET é público. PUT é admin (middleware no router).
// ============================================================

import { storeSettingsService } from '../services/storeSettingsService.js';

export function getSettings(req, res, next) {
  storeSettingsService
    .getSettings()
    .then((settings) => res.json(settings))
    .catch(next);
}

export function updateSettings(req, res, next) {
  storeSettingsService
    .updateSettings(req.body)
    .then((settings) => res.json(settings))
    .catch(next);
}