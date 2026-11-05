import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  constructor(private readonly source: DataSource) {}
  async onApplicationShutdown() {
    if (this.source.isInitialized) await this.source.destroy();
  }
}
