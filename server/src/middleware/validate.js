// Validação de entrada simples baseada em schema
// Uso: validate({ name: 'string', price: 'number', stock: 'number?' })
// '?' no final = opcional

export function validate(schema) {
  return (req, res, next) => {
    const errors = [];
    const source = { ...req.body, ...req.params, ...req.query };

    for (const [field, type] of Object.entries(schema)) {
      const isOptional = type.endsWith('?');
      const cleanType = isOptional ? type.slice(0, -1) : type;
      const value = source[field];

      if (value === undefined || value === null) {
        if (!isOptional) {
          errors.push({ field, message: `${field} é obrigatório` });
        }
        continue;
      }

      if (cleanType === 'string' && typeof value !== 'string') {
        errors.push({ field, message: `${field} deve ser uma string` });
      } else if (cleanType === 'number' && typeof value !== 'number' && isNaN(Number(value))) {
        errors.push({ field, message: `${field} deve ser um número` });
      } else if (cleanType === 'boolean' && typeof value !== 'boolean') {
        errors.push({ field, message: `${field} deve ser um booleano` });
      } else if (cleanType === 'array' && !Array.isArray(value)) {
        errors.push({ field, message: `${field} deve ser um array` });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validação falhou', details: errors });
    }

    next();
  };
}