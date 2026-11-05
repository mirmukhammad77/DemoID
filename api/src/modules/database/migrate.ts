import { createDataSource } from './data-source';
async function migrate() {
  const source = createDataSource();
  try { await source.initialize(); const migrations = await source.runMigrations(); console.log('Applied migrations: ' + migrations.length); }
  finally { if (source.isInitialized) await source.destroy(); }
}
void migrate().catch(() => { console.error('Database migration failed. Check the database path and file permissions.'); process.exitCode = 1; });
