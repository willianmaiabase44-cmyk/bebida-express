// Tratamento de erros centralizado — deve ser o último middleware
export function errorHandler(err, req, res, next) {
  // Erro do Multer (upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Arquivo muito grande' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Campo de arquivo inesperado' });
  }

  // Erro de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message, details: err.details });
  }

  // Erro de sintaxe JSON
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
  }

  console.error('Erro não tratado:', err);
  const status = err.status || 500;
  // Erros 5xx: não expõe detalhes internos ao cliente
  if (status >= 500) {
    return res.status(status).json({ error: 'Erro interno do servidor' });
  }
  res.status(status).json({
    error: err.message || 'Erro interno do servidor',
  });
}

// Wrapper para async routes — captura erros automaticamente
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}