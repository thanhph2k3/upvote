import { Router } from 'express';
import { container } from '../../container.js';

export function createHealthRouter(healthController) {
  const router = Router();

  router.get('/', healthController.getStatus);
  router.get('/db', healthController.getDatabaseStatus);

  return router;
}

export const healthRouter = createHealthRouter(container.healthController);
