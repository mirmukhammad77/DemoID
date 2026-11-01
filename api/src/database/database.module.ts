import { Global, Module, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfig } from '../config/config.module';
import { createDataSource } from './data-source';
@Injectable()
class DatabaseLifecycle implements OnApplicationShutdown {
  constructor(private readonly source: DataSource) {}
  async onApplicationShutdown() { if (this.source.isInitialized) await this.source.destroy(); }
}
@Global()
@Module({ providers: [{ provide: DataSource, inject: [AppConfig], useFactory: async (config: AppConfig) => { const source = createDataSource(config.databasePath); await source.initialize(); await source.runMigrations(); return source; } }, DatabaseLifecycle], exports: [DataSource] })
export class DatabaseModule {}
