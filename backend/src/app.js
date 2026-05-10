import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { container } from './container.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { createV1Router } from './routes/v1/index.js';

export function createApp({ dependencies = container } = {}) {
  const app = express();
  const v1Router = createV1Router(dependencies);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

  app.get('/', (_req, res) => {
    res.json({
      service: 'upvote-api',
      status: 'ok',
      apiBasePath: '/api/v1',
    });
  });

  app.use('/api/v1', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/v1', v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
