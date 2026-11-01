import { Injectable, Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { User } from '../database/user.entity';
import { fail, unavailable } from '../common/errors';
import { PasswordService } from './password.service';
@Injectable()
export class UsersService {
  constructor(private readonly source: DataSource, private readonly passwords: PasswordService) {}
  async ensureAvailable(email: string) {
    let user: User | null;
    try { user = await this.source.getRepository(User).findOneBy({ email }); } catch { return unavailable(); }
    if (user) fail(409, 'EMAIL_CONFLICT', 'This email is already registered.');
  }
  async credentials(email: string, password: string): Promise<User> {
    let user: User | null;
    try { user = await this.source.getRepository(User).findOneBy({ email }); } catch { return unavailable(); }
    if (!await this.passwords.verify(password, user?.passwordHash) || !user) fail(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    return user;
  }
  hashPassword(password: string) { return this.passwords.hash(password); }
  async create(user: User) {
    try { await this.source.getRepository(User).insert(user); }
    catch (error) {
      const driverError = (error as { driverError?: { code?: string; message?: string } }).driverError;
      if (driverError?.code?.startsWith('SQLITE_CONSTRAINT') && driverError.message?.includes('users.email')) fail(409, 'EMAIL_CONFLICT', 'This email is already registered.');
      return unavailable();
    }
  }
}
@Module({ providers: [UsersService, PasswordService], exports: [UsersService] })
export class UsersModule {}
