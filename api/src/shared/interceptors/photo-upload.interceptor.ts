import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_PHOTO_BYTES } from '../utils/photo.util';

export const PhotoUpload = () => FileInterceptor('photo', {
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 5, fieldSize: 1024, parts: 6 },
});
