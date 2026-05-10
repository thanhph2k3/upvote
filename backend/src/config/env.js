import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['DATABASE_URL'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseNumber(process.env.PORT, 3000),
  databaseUrl: process.env.DATABASE_URL,
  databaseConnectionTimeoutMs: parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 5000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};
