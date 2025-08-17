import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import type { Database } from 'better-sqlite3';
import BetterSqlite3 from 'better-sqlite3';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Initializes a database connection.
 * @param dbPath The path to the database file.
 * @returns An instance of the better-sqlite3 database.
 */
export function getDb(dbPath: string): Database {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  console.log(`Initializing database at: ${dbPath}`);
  const db = new BetterSqlite3(dbPath, { verbose: isDev ? console.log : undefined });

  // Enable WAL mode for better concurrency and performance.
  db.pragma('journal_mode = WAL');
  // Enforce foreign key constraints.
  db.pragma('foreign_keys = ON');

  return db;
}

/**
 * Runs database migrations.
 * @param db The database instance to run migrations on.
 */
export function runMigrations(db: Database) {
  console.log('Checking for migrations...');

  const migrationsDir = isDev
    ? path.join(process.cwd(), 'src/main/migrations')
    : path.join(__dirname, 'migrations');

  // The migrations table is created in the first migration, but we need to ensure it exists
  // before we try to query it.
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now', 'localtime'))
    );
  `);

  const appliedMigrations = db.prepare('SELECT name FROM migrations').all() as { name: string }[];
  const appliedMigrationNames = new Set(appliedMigrations.map(m => m.name));

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  let migrationsRun = 0;
  for (const file of migrationFiles) {
    if (!appliedMigrationNames.has(file)) {
      console.log(`Applying migration: ${file}`);
      try {
        const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        const runMigrationTx = db.transaction(() => {
          db.exec(migrationSql);
          db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
        });
        runMigrationTx();
        migrationsRun++;
      } catch (error) {
        console.error(`Failed to apply migration ${file}:`, error);
        throw new Error(`Migration ${file} failed.`);
      }
    }
  }

  if (migrationsRun > 0) {
    console.log(`Successfully applied ${migrationsRun} new migration(s).`);
  } else {
    console.log('Database is up to date.');
  }
}

// --- Electron App Specific Database Initialization ---

// Determine the correct database path based on the environment.
const dbPath = isDev
  ? path.join(process.cwd(), 'treasury.db')
  : path.join(app.getPath('userData'), 'treasury.db');

const db = getDb(dbPath);

// Run migrations automatically for the main app instance.
try {
  runMigrations(db);
} catch (error) {
  console.error('Failed to initialize and migrate database. The app may not function correctly.', error);
  // In a real app, you might want to show an error dialog and quit.
  // For now, we log the error and continue.
}

// Export the single, app-wide database instance.
export default db;
