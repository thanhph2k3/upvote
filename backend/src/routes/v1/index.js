import { Router } from 'express';
import { container } from '../../container.js';
import { createHealthRouter } from './health.routes.js';
import { createVoteRouter } from './vote.routes.js';

export function createV1Router({ healthController, voteController } = container) {
  const router = Router();

  router.use('/health', createHealthRouter(healthController));
  router.use('/vote', createVoteRouter(voteController));

  return router;
}

export const v1Router = createV1Router();
