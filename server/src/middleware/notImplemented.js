// Middleware para endpoints ainda não implementados (Etapa 2)
// Retorna 501 Not Implemented com mensagem clara — NÃO simula sucesso
export function notImplemented(feature) {
  return (req, res) => {
    res.status(501).json({
      status: 'pendente',
      message: `${feature} — endpoint preparado, implementação pendente (Etapa 2)`,
      method: req.method,
      path: req.originalUrl,
    });
  };
}