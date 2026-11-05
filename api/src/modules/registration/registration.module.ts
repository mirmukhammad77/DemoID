import { Module } from '@nestjs/common';
import { PhotoValidationPipe } from '../../shared/pipes/photo-validation.pipe';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';
import { BiometricsModule } from '../biometrics/biometrics.module';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

@Module({ imports: [UsersModule, StorageModule, BiometricsModule], controllers: [RegistrationController],
  providers: [RegistrationService, PhotoValidationPipe] })
export class RegistrationModule {}
