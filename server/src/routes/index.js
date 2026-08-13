import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import productsRouter from './products.js';
import ordersRouter from './orders.js';
import customersRouter from './customers.js';
import addressesRouter from './addresses.js';
import salesRouter from './sales.js';
import motoboysRouter from './motoboys.js';
import deliveriesRouter from './deliveries.js';
import reviewsRouter from './reviews.js';
import stockMovementsRouter from './stock-movements.js';
import promotionsRouter from './promotions.js';
import storeSettingsRouter from './store-settings.js';
import suppliersRouter from './suppliers.js';
import couponsRouter from './coupons.js';
import freightRouter from './freight.js';
import uploadRouter from './upload.js';

const router = Router();

// Health check (implementado — testa PostgreSQL)
router.use('/health', healthRouter);

// Rotas preparadas (estrutura pronta, implementação pendente — Etapa 2)
router.use('/auth', authRouter);
router.use('/products', productsRouter);
router.use('/orders', ordersRouter);
router.use('/customers', customersRouter);
router.use('/addresses', addressesRouter);
router.use('/sales', salesRouter);
router.use('/motoboys', motoboysRouter);
router.use('/deliveries', deliveriesRouter);
router.use('/reviews', reviewsRouter);
router.use('/stock-movements', stockMovementsRouter);
router.use('/promotions', promotionsRouter);
router.use('/store-settings', storeSettingsRouter);
router.use('/suppliers', suppliersRouter);
router.use('/coupons', couponsRouter);
router.use('/freight', freightRouter);

// Upload (implementado — Multer)
router.use('/upload', uploadRouter);

export default router;