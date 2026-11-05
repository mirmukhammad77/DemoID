import { Injectable } from '@nestjs/common';
import { fail, unavailable } from '../../shared/errors/application.error';
import { User } from './entity/user.entity';
import { PasswordService } from './password.service';
import { PersistenceError, UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly users: UsersRepository, private readonly passwords: PasswordService) {}

  private async findByEmail(email: string): Promise<User | null> {
    try { return await this.users.findByEmail(email); }
    catch { return unavailable(); }
  }

  async ensureAvailable(email: string): Promise<void> {
    if (await this.findByEmail(email)) fail('EMAIL_CONFLICT', 'This email is already registered.');
  }

  async credentials(email: string, password: string): Promise<User> {
    const user = await this.findByEmail(email);
    if (!await this.passwords.verify(password, user?.passwordHash) || !user) {
      fail('INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    return user;
  }

  hashPassword(password: string) { return this.passwords.hash(password); }

  async create(user: User): Promise<void> {
    try { await this.users.insert(user); }
    catch (error) {
      if (error instanceof PersistenceError && error.kind === 'email-conflict') {
        fail('EMAIL_CONFLICT', 'This email is already registered.');
      }
      unavailable();
    }
  }
}
