import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { container } from './container.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundHandler } from './middleware/not-found-handler.js';
import { createV1Router } from './routes/v1/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '..', 'public');

export function createApp({ dependencies = container } = {}) {
  const app = express();
  const v1Router = createV1Router(dependencies);

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(
    express.static(publicDir, {
      etag: false,
      lastModified: false,
      setHeaders(res) {
        res.set('Cache-Control', 'no-store');
      },
    }),
  );

  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use('/api/v1', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/v1', v1Router);

  app.get('*', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
