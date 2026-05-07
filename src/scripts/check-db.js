import { closePool, query } from '../config/db.js';

try {
  const result = await query('SELECT current_database() AS database, NOW() AS checked_at');

  console.log(`Connected to database "${result.rows[0].database}" at ${result.rows[0].checked_at.toISOString()}`);
} catch (error) {
  console.error('Database connection failed');
  console.error(error.message || error.code || error);
  process.exitCode = 1;
} finally {
  await closePool();
}
