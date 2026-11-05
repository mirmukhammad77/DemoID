import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { User } from '../users/entity/user.entity';
import { InitialUsers1793520000000 } from '../../../migrations/initial.migration';
export function createDataSource(databasePath = resolve(process.env.DATABASE_PATH ?? 'data/demoid.sqlite')) {
  mkdirSync(dirname(databasePath), { recursive: true });
  return new DataSource({ type: 'better-sqlite3', database: databasePath, entities: [User], migrations: [InitialUsers1793520000000], synchronize: false, logging: false });
}

export async function initializeDataSource(databasePath: string): Promise<DataSource> {
  const source = createDataSource(databasePath);
  try {
    await source.initialize();
    await source.runMigrations();
    return source;
  } catch (error) {
    if (source.isInitialized) await source.destroy();
    throw error;
  }
}
