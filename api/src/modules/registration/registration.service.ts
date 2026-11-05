import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Credentials } from '../../shared/types/credentials.type';
import { ValidatedPhoto } from '../../shared/types/validated-photo.type';
import { AppConfig } from '../config/config.service';
import { UsersService } from '../users/users.service';
import { StorageService } from '../storage/storage.service';
import { BiometricsService } from '../biometrics/biometrics.service';
import { recordEnrollmentCleanup } from './utils/enrollment-cleanup.util';

export interface RegistrationDetails extends Credentials {
  firstName: string;
  lastName: string;
  birthDate: string;
}

@Injectable()
export class RegistrationService {
  constructor(private readonly users: UsersService, private readonly storage: StorageService,
    private readonly biometrics: BiometricsService, private readonly config: AppConfig) {}

  async validate(details: RegistrationDetails) {
    await this.users.ensureAvailable(details.email);
    return { valid: true };
  }

  async complete(details: RegistrationDetails, photo: ValidatedPhoto) {
    await this.users.ensureAvailable(details.email);
    await this.biometrics.validateEnrollment(photo.bytes);
    const id = randomUUID();
    const key = 'references/' + id + '/' + randomUUID();
    const passwordHash = await this.users.hashPassword(details.password);
    try {
      await this.storage.put(key, photo.bytes, photo.contentType);
      await this.users.create({ id, email: details.email, passwordHash, firstName: details.firstName,
        lastName: details.lastName, birthDate: details.birthDate, faceObjectKey: key,
        createdAt: new Date().toISOString() });
    } catch (error) {
      try { await this.storage.remove(key); }
      catch { await recordEnrollmentCleanup(this.config.databasePath, key); }
      throw error;
    }
    return { message: 'Registration complete' };
  }
}
