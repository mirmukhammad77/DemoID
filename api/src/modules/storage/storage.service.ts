import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { AppConfig } from '../config/config.service';
import { MAX_PHOTO_BYTES } from '../../shared/utils/photo.util';
import { unavailable } from '../../shared/errors/application.error';

@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly client: S3Client;
  constructor(private readonly config: AppConfig) {
    this.client = new S3Client({ endpoint: config.minioEndpoint, region: config.minioRegion, forcePathStyle: true,
      credentials: { accessKeyId: config.minioAccessKey, secretAccessKey: config.minioSecretKey }, maxAttempts: 2,
      requestHandler: new NodeHttpHandler({ connectionTimeout: 3000, requestTimeout: 8000 }) });
  }
  async put(key: string, image: Buffer, contentType: string) {
    try { await this.client.send(new PutObjectCommand({ Bucket: this.config.minioBucket, Key: key, Body: image, ContentType: contentType }), { abortSignal: AbortSignal.timeout(12000) }); }
    catch { return unavailable(); }
  }
  async get(key: string): Promise<Buffer> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.minioBucket, Key: key }), { abortSignal: AbortSignal.timeout(12000) });
      if (!result.Body) throw new Error('Missing object');
      const stream = result.Body as AsyncIterable<Uint8Array> & { destroy?: () => void };
      if ((result.ContentLength ?? 0) > MAX_PHOTO_BYTES) { stream.destroy?.(); throw new Error('Oversize object'); }
      const chunks: Buffer[] = []; let total = 0;
      for await (const chunk of stream) {
        total += chunk.length;
        if (total > MAX_PHOTO_BYTES) { stream.destroy?.(); throw new Error('Oversize object'); }
        chunks.push(Buffer.from(chunk));
      }
      if (!total) throw new Error('Empty object');
      return Buffer.concat(chunks);
    } catch { return unavailable(); }
  }
  async remove(key: string) {
    try { await this.client.send(new DeleteObjectCommand({ Bucket: this.config.minioBucket, Key: key }), { abortSignal: AbortSignal.timeout(12000) }); }
    catch { return unavailable(); }
  }
  onModuleDestroy() { this.client.destroy(); }
}
