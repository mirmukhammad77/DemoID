import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from './entity/user.entity';

export class PersistenceError extends Error {
  constructor(readonly kind: 'email-conflict' | 'unavailable') {
    super('Account persistence failed');
  }
}

@Injectable()
export class UsersRepository {
  constructor(private readonly source: DataSource) {}

  async findByEmail(email: string): Promise<User | null> {
    try { return await this.source.getRepository(User).findOneBy({ email }); }
    catch { throw new PersistenceError('unavailable'); }
  }

  async insert(user: User): Promise<void> {
    try { await this.source.getRepository(User).insert(user); }
    catch (error) {
      const driver = (error as { driverError?: { code?: string; message?: string } })?.driverError;
      const duplicate = driver?.code?.startsWith('SQLITE_CONSTRAINT') && driver.message?.includes('users.email');
      throw new PersistenceError(duplicate ? 'email-conflict' : 'unavailable');
    }
  }
}
