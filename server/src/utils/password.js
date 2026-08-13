import bcrypt from 'bcrypt';

// Hash de senha com bcrypt (futuro: substituirá PBKDF2 do Base44)
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Verificação de senha
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Gera salt + hash (compatível com schema que separa salt)
export async function hashPasswordWithSalt(password) {
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
}