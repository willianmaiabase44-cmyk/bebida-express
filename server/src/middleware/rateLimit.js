// ============================================================
// rateLimit.js — Rate limiting simples (in-memory, por IP)
// ============================================================
// Limita o número de requisições por IP em uma janela de tempo.
// Usa Map em memória — suficiente para instância única.
// ============================================================

const rateLimitMap = new Map();

export function rateLimit({ windowMs = 60000, max = 5, message = 'Muitas tentativas. Tente novamente mais tarde.' }) {
  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    // Limpa entradas expiradas periodicamente
    if (rateLimitMap.size > 500) {
      for (const [k, v] of rateLimitMap) {
        if (now > v.resetTime) rateLimitMap.delete(k);
      }
    }

    const record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message });
    }

    record.count++;
    return next();
  };
}

// Presets
export const loginLimiter = rateLimit({ windowMs: 60000, max: 5, message: 'Muitas tentativas de login. Aguarde 1 minuto.' });
export const passwordResetLimiter = rateLimit({ windowMs: 60000, max: 3, message: 'Muitas solicitações de reset. Aguarde 1 minuto.' });