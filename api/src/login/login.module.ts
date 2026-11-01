import { Body, Controller, HttpCode, Module, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CredentialsDto } from '../common/validation';
import { PhotoService, PhotoUpload } from '../common/photo';
import { profileOf } from '../database/user.entity';
import { UsersModule, UsersService } from '../users/users.module';
import { StorageModule, StorageService } from '../storage/storage.module';
import { BiometricsModule, BiometricsService } from '../biometrics/biometrics.module';

@Controller('login')
class LoginController {
  constructor(private readonly users: UsersService, private readonly storage: StorageService,
    private readonly biometrics: BiometricsService, private readonly photos: PhotoService) {}
  @Post('credentials') @HttpCode(200)
  async credentials(@Body() details: CredentialsDto) { await this.users.credentials(details.email, details.password); return { valid: true }; }
  @Post('verify-face') @HttpCode(200) @UseInterceptors(PhotoUpload())
  async verifyFace(@Body() details: CredentialsDto, @UploadedFile() file?: Express.Multer.File) {
    const user = await this.users.credentials(details.email, details.password);
    const image = await this.photos.validate(file);
    const reference = await this.storage.get(user.faceObjectKey);
    await this.biometrics.compare(reference, image);
    return profileOf(user);
  }
}
@Module({ imports: [UsersModule, StorageModule, BiometricsModule], controllers: [LoginController], providers: [PhotoService] })
export class LoginModule {}
