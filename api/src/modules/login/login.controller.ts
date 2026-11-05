import { Body, Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { PhotoUpload } from '../../shared/interceptors/photo-upload.interceptor';
import { PhotoValidationPipe } from '../../shared/pipes/photo-validation.pipe';
import type { ValidatedPhoto } from '../../shared/types/validated-photo.type';
import { LoginDto } from './dtos/login.dto';
import { LoginService } from './login.service';

@Controller('login')
export class LoginController {
  constructor(private readonly login: LoginService) {}

  @Post('credentials') @HttpCode(200)
  credentials(@Body() details: LoginDto) { return this.login.credentials(details); }

  @Post('verify-face') @HttpCode(200) @UseInterceptors(PhotoUpload())
  verifyFace(@Body() details: LoginDto, @UploadedFile(PhotoValidationPipe) photo: ValidatedPhoto) {
    return this.login.verifyFace(details, photo);
  }
}
