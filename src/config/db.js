import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error', error);
});

export class Database {
  constructor(pgPool) {
    this.pool = pgPool;
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async connect() {
    return this.pool.connect();
  }

  async close() {
    await this.pool.end();
  }
}

export const database = new Database(pool);

export async function query(text, params) {
  return database.query(text, params);
}

export async function closePool() {
  await database.close();
}
