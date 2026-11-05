import { Global, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfig } from '../config/config.service';
import { initializeDataSource } from './data-source';
import { DatabaseService } from './database.service';

@Global()
@Module({ providers: [
  { provide: DataSource, inject: [AppConfig], useFactory: (config: AppConfig) => initializeDataSource(config.databasePath) },
  DatabaseService,
], exports: [DataSource] })
export class DatabaseModule {}
