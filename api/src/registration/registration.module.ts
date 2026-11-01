import { Body, Controller, HttpCode, Injectable, Module, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { RegistrationDto } from '../common/validation';
import { PhotoService, PhotoUpload } from '../common/photo';
import { AppConfig } from '../config/config.module';
import { UsersModule, UsersService } from '../users/users.module';
import { StorageModule, StorageService } from '../storage/storage.module';
import { BiometricsModule, BiometricsService } from '../biometrics/biometrics.module';

@Injectable()
class RegistrationService {
  constructor(private readonly users: UsersService, private readonly storage: StorageService,
    private readonly biometrics: BiometricsService, private readonly photos: PhotoService, private readonly config: AppConfig) {}
  async validate(details: RegistrationDto) { await this.users.ensureAvailable(details.email); return { valid: true }; }
  async complete(details: RegistrationDto, file?: Express.Multer.File) {
    await this.users.ensureAvailable(details.email);
    const image = await this.photos.validate(file);
    await this.biometrics.validateEnrollment(image);
    const id = randomUUID(); const key = 'references/' + id + '/' + randomUUID();
    const passwordHash = await this.users.hashPassword(details.password);
    try {
      await this.storage.put(key, image, file!.mimetype);
      await this.users.create({ id, email: details.email, passwordHash, firstName: details.firstName, lastName: details.lastName,
        birthDate: details.birthDate, faceObjectKey: key, createdAt: new Date().toISOString() });
    } catch (error) {
      try { await this.storage.remove(key); }
      catch {
        const record = JSON.stringify({ key, createdAt: new Date().toISOString(), reason: 'Enrollment cleanup required' }) + '\n';
        try { await appendFile(join(dirname(this.config.databasePath), 'orphan-cleanup.jsonl'), record, { mode: 0o600 }); }
        catch { console.error('Enrollment cleanup required for object: ' + key); }
      }
      throw error;
    }
    return { message: 'Registration complete' };
  }
}
@Controller('registration')
class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}
  @Post('validate') @HttpCode(200)
  validate(@Body() details: RegistrationDto) { return this.registration.validate(details); }
  @Post('complete') @UseInterceptors(PhotoUpload())
  complete(@Body() details: RegistrationDto, @UploadedFile() file?: Express.Multer.File) { return this.registration.complete(details, file); }
}
@Module({ imports: [UsersModule, StorageModule, BiometricsModule], controllers: [RegistrationController], providers: [RegistrationService, PhotoService] })
export class RegistrationModule {}
