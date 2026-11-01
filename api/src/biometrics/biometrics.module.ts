import { Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { CompareFacesCommand, DetectFacesCommand, RekognitionClient } from '@aws-sdk/client-rekognition';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { AppConfig } from '../config/config.module';
import { fail, unavailable } from '../common/errors';

@Injectable()
export class BiometricsService implements OnModuleDestroy {
  private readonly client: RekognitionClient;
  constructor(private readonly config: AppConfig) {
    this.client = new RekognitionClient({ region: config.awsRegion, maxAttempts: 2,
      requestHandler: new NodeHttpHandler({ connectionTimeout: 3000, requestTimeout: 8000 }) });
  }
  private providerFailure(error: unknown): never {
    const name = (error as { name?: string })?.name;
    if (['InvalidParameterException', 'InvalidImageFormatException', 'ImageTooLargeException'].includes(name ?? '')) fail(422, 'INVALID_FACE', 'Show one clearly visible face and capture a new photo.');
    return unavailable();
  }
  async validateEnrollment(image: Buffer) {
    let result;
    try { result = await this.client.send(new DetectFacesCommand({ Image: { Bytes: image }, Attributes: ['DEFAULT'] }), { abortSignal: AbortSignal.timeout(15000) }); }
    catch (error) { return this.providerFailure(error); }
    if (result.FaceDetails?.length !== 1) fail(422, 'INVALID_FACE', 'Show exactly one face and capture a new photo.');
  }
  async compare(reference: Buffer, candidate: Buffer) {
    let result;
    try { result = await this.client.send(new CompareFacesCommand({ SourceImage: { Bytes: reference }, TargetImage: { Bytes: candidate }, SimilarityThreshold: this.config.similarityThreshold, QualityFilter: 'NONE' }), { abortSignal: AbortSignal.timeout(15000) }); }
    catch (error) { return this.providerFailure(error); }
    const matches = result.FaceMatches ?? [];
    if (matches.length + (result.UnmatchedFaces?.length ?? 0) !== 1) fail(422, 'INVALID_FACE', 'Show exactly one face and capture a new photo.');
    if (matches.length !== 1 || !Number.isFinite(matches[0].Similarity) || matches[0].Similarity! < this.config.similarityThreshold) fail(401, 'FACE_MISMATCH', 'Your face did not match. Please try a new capture.');
  }
  onModuleDestroy() { this.client.destroy(); }
}
@Module({ providers: [BiometricsService], exports: [BiometricsService] })
export class BiometricsModule {}
