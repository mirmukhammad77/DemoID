import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { RegistrationModule } from './registration/registration.module';
import { LoginModule } from './login/login.module';
@Module({ imports: [ConfigModule, DatabaseModule, RegistrationModule, LoginModule] })
export class AppModule {}
