import { Injectable, PipeTransform } from '@nestjs/common';
import sharp from 'sharp';
import { fail } from '../errors/application.error';
import { ValidatedPhoto } from '../types/validated-photo.type';
import { MAX_PHOTO_BYTES, MAX_PHOTO_PIXELS } from '../utils/photo.util';

@Injectable()
export class PhotoValidationPipe implements PipeTransform<Express.Multer.File | undefined, Promise<ValidatedPhoto>> {
  async transform(file?: Express.Multer.File): Promise<ValidatedPhoto> {
    if (!file?.buffer?.length) fail('INVALID_IMAGE', 'Capture a photo before continuing.');
    const bytes = file.buffer;
    if (bytes.length > MAX_PHOTO_BYTES) fail('IMAGE_TOO_LARGE', 'The image must be no larger than 5 MB.');
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const contentType = png ? 'image/png' : 'image/jpeg';
    if ((!png && !jpeg) || file.mimetype !== contentType) fail('INVALID_IMAGE', 'Capture a valid JPEG or PNG photo.');
    try {
      const image = sharp(bytes, { failOn: 'warning', limitInputPixels: MAX_PHOTO_PIXELS });
      const metadata = await image.metadata();
      if (metadata.format !== (png ? 'png' : 'jpeg') || (metadata.pages ?? 1) !== 1) throw new Error('Invalid format');
      await image.stats();
    } catch {
      fail('INVALID_IMAGE', 'The photo could not be read. Please capture it again.');
    }
    return { bytes, contentType };
  }
}
