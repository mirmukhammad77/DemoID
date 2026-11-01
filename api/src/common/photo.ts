import { Injectable } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import sharp from 'sharp';
import { fail } from './errors';

export const MAX_PHOTO_BYTES = 5_242_880;
export const PhotoUpload = () => FileInterceptor('photo', {
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 5, fieldSize: 1024, parts: 6 },
});

@Injectable()
export class PhotoService {
  async validate(file?: Express.Multer.File): Promise<Buffer> {
    if (!file?.buffer?.length) fail(400, 'INVALID_IMAGE', 'Capture a photo before continuing.');
    if (file.buffer.length > MAX_PHOTO_BYTES) fail(413, 'IMAGE_TOO_LARGE', 'The image must be no larger than 5 MB.');
    const bytes = file.buffer;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if ((!png && !jpeg) || file.mimetype !== (png ? 'image/png' : 'image/jpeg')) fail(400, 'INVALID_IMAGE', 'Capture a valid JPEG or PNG photo.');
    try {
      const image = sharp(bytes, { failOn: 'warning', limitInputPixels: 20_000_000 });
      const metadata = await image.metadata();
      if (metadata.format !== (png ? 'png' : 'jpeg') || (metadata.pages ?? 1) !== 1) throw new Error('Invalid format');
      await image.stats();
    } catch { fail(400, 'INVALID_IMAGE', 'The photo could not be read. Please capture it again.'); }
    return bytes;
  }
}
