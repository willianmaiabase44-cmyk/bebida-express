import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import router from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { config } from './config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Arquivos estáticos (uploads servidos pelo próprio backend)
const uploadDir = path.resolve(__dirname, '..', config.upload.dir);
// Garante que o diretório de uploads existe
import { mkdirSync } from 'fs';
mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// Rotas da API
app.use('/api', router);

// Raiz
app.get('/', (req, res) => {
  res.json({ service: 'smoke-bebidas-backend', version: '0.1.0', status: 'infraestrutura paralela — Etapa 1' });
});

// Tratamento de erros (deve ser o último middleware)
app.use(errorHandler);

export default app;