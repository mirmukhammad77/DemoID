import { Injectable } from '@nestjs/common';
import { fail, unavailable } from '../../shared/errors/application.error';
import { DeepFaceClient } from './clients/deepface.client';

@Injectable()
export class BiometricsService {
  constructor(private readonly client: DeepFaceClient) {}

  async validateEnrollment(image: Buffer): Promise<void> {
    if (await this.client.detect(image) !== 1) {
      fail('INVALID_FACE', 'Show exactly one face and capture a new photo.');
    }
  }

  async compare(reference: Buffer, candidate: Buffer): Promise<void> {
    const result = await this.client.compare(reference, candidate);
    if (result.referenceFaceCount !== 1) return unavailable();
    if (result.candidateFaceCount !== 1) fail('INVALID_FACE', 'Show exactly one face and capture a new photo.');
    if (result.status !== 'compared') return unavailable();
    if (result.distance > result.threshold) fail('FACE_MISMATCH', 'Your face did not match. Please try a new capture.');
  }
}
