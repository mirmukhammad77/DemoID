import { Injectable } from '@nestjs/common';
import { Credentials } from '../../shared/types/credentials.type';
import { ValidatedPhoto } from '../../shared/types/validated-photo.type';
import { UsersService } from '../users/users.service';
import { StorageService } from '../storage/storage.service';
import { BiometricsService } from '../biometrics/biometrics.service';
import { profileOf } from './utils/profile.util';

@Injectable()
export class LoginService {
  constructor(private readonly users: UsersService, private readonly storage: StorageService,
    private readonly biometrics: BiometricsService) {}

  async credentials(details: Credentials) {
    await this.users.credentials(details.email, details.password);
    return { valid: true };
  }

  async verifyFace(details: Credentials, photo: ValidatedPhoto) {
    const user = await this.users.credentials(details.email, details.password);
    const reference = await this.storage.get(user.faceObjectKey);
    await this.biometrics.compare(reference, photo.bytes);
    return profileOf(user);
  }
}
