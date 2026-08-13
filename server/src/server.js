import 'dotenv/config';
import app from './app.js';
import { testConnection } from './db/index.js';

const PORT = process.env.BACKEND_PORT || 4000;

async function start() {
  // Testa conexão com PostgreSQL na inicialização
  const dbStatus = await testConnection();
  if (dbStatus.ok) {
    console.log('✅ PostgreSQL conectado:', dbStatus.timestamp);
  } else {
    console.warn('⚠️  PostgreSQL não conectou:', dbStatus.error);
    console.warn('   O backend iniciará mesmo assim — /api/health retornará database: disconnected');
  }

  app.listen(PORT, () => {
    console.log(`🚀 Smoke Bebidas backend rodando na porta ${PORT}`);
    console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
}

start();