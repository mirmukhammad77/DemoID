import { Module } from '@nestjs/common';
import { PhotoValidationPipe } from '../../shared/pipes/photo-validation.pipe';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';
import { BiometricsModule } from '../biometrics/biometrics.module';
import { LoginController } from './login.controller';
import { LoginService } from './login.service';

@Module({ imports: [UsersModule, StorageModule, BiometricsModule], controllers: [LoginController],
  providers: [LoginService, PhotoValidationPipe] })
export class LoginModule {}
