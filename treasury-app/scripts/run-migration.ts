/**
 * This script is for running migrations from the command line.
 * e.g., `npm run migrate`
 */
import path from 'node:path';
import { getDb, runMigrations } from '../src/main/db';

// Set the environment to development so the DB path is correct.
process.env.NODE_ENV = 'development';

console.log('Running migration script...');

try {
  // Use the same DB path that is used in development mode in the app.
  const devDbPath = path.join(process.cwd(), 'treasury.db');
  const db = getDb(devDbPath);
  runMigrations(db);
  db.close();
  console.log('Migration script finished successfully.');
  process.exit(0);
} catch (error) {
  console.error('Migration script failed:', error);
  process.exit(1);
}
