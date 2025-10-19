import { Router } from 'express';

import authRoutes from './auth.routes';
import todoRoutes from './todo.routes';
import uploadRoutes from './upload.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.use('/auth', authRoutes);
router.use('/todos', todoRoutes);
router.use('/upload', uploadRoutes);

export default router;
