import { Body, Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { PhotoUpload } from '../../shared/interceptors/photo-upload.interceptor';
import { PhotoValidationPipe } from '../../shared/pipes/photo-validation.pipe';
import type { ValidatedPhoto } from '../../shared/types/validated-photo.type';
import { RegistrationDto } from './dtos/registration.dto';
import { RegistrationService } from './registration.service';

@Controller('registration')
export class RegistrationController {
  constructor(private readonly registration: RegistrationService) {}

  @Post('validate') @HttpCode(200)
  validate(@Body() details: RegistrationDto) { return this.registration.validate(details); }

  @Post('complete') @UseInterceptors(PhotoUpload())
  complete(@Body() details: RegistrationDto, @UploadedFile(PhotoValidationPipe) photo: ValidatedPhoto) {
    return this.registration.complete(details, photo);
  }
}
