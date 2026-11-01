import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { User } from './user.entity';
import { InitialUsers1793520000000 } from './initial.migration';
export function createDataSource(databasePath = resolve(process.env.DATABASE_PATH ?? 'data/demoid.sqlite')) {
  mkdirSync(dirname(databasePath), { recursive: true });
  return new DataSource({ type: 'better-sqlite3', database: databasePath, entities: [User], migrations: [InitialUsers1793520000000], synchronize: false, logging: false });
}
