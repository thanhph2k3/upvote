import { createApp } from './app.js';
import { database } from './config/db.js';
import { env } from './config/env.js';

class ServerApplication {
  constructor({ app, databaseClient, config }) {
    this.app = app;
    this.database = databaseClient;
    this.config = config;
    this.server = null;
  }

  async start() {
    try {
      console.log(`Connecting to database at ${this.#getDatabaseTarget()}`);

      const result = await this.database.query('SELECT current_database() AS database_name, NOW() AS connected_at');
      const { database_name: databaseName, connected_at: connectedAt } = result.rows[0];

      console.log(`Connected to database "${databaseName}" at ${connectedAt.toISOString()}`);

      this.server = this.app.listen(this.config.port, () => {
        console.log(`API listening on port ${this.config.port}`);
      });
    } catch (error) {
      console.error('Database connection failed');
      console.error(error.message || error.code || error);
      await this.database.close().catch(() => {});
      process.exit(1);
    }
  }

  async shutdown(signal) {
    console.log(`${signal} received, shutting down`);

    if (!this.server) {
      await this.database.close();
      process.exit(0);
    }

    this.server.close(async () => {
      await this.database.close();
      process.exit(0);
    });
  }

  #getDatabaseTarget() {
    try {
      const url = new URL(this.config.databaseUrl);
      return `${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}`;
    } catch {
      return 'invalid DATABASE_URL';
    }
  }
}

const serverApp = new ServerApplication({
  app: createApp(),
  databaseClient: database,
  config: env,
});

process.on('SIGINT', (signal) => serverApp.shutdown(signal));
process.on('SIGTERM', (signal) => serverApp.shutdown(signal));

serverApp.start();
