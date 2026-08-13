// Middleware de autorização — apenas admin
// Deve ser usado DEPOIS de authMiddleware
export function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticação obrigatória' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' });
  }
  next();
}