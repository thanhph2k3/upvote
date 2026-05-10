import { Router } from 'express';
import { container } from '../../container.js';
import { createVoteRouter } from './vote.routes.js';

export function createV1Router({ voteController } = container) {
  const router = Router();

  router.use('/vote', createVoteRouter(voteController));

  return router;
}

export const v1Router = createV1Router();
