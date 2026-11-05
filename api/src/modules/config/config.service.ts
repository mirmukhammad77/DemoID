import { Injectable } from '@nestjs/common';
import { resolve } from 'node:path';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('Missing configuration: ' + name);
  return value;
}
function integer(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('Invalid configuration: ' + name);
  return value;
}
function httpUrl(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback || required(name);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('Invalid configuration: ' + name);
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
function frontendOrigins(value: string): string[] {
  const url = new URL(value);
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('WEB_ORIGIN must contain only a scheme, hostname, and optional port');
  const origins = [url.origin];
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
    origins.push(url.origin);
  }
  return origins;
}
@Injectable()
export class AppConfig {
  constructor() {
    if (process.env.FACE_SIMILARITY_THRESHOLD !== undefined) {
      throw new Error('FACE_SIMILARITY_THRESHOLD is retired. Remove it and configure DEEPFACE_DISTANCE_THRESHOLD in deepface-service/.env if needed.');
    }
  }
  readonly port = integer('PORT', 3000, 1, 65535);
  readonly host = process.env.HOST ?? '127.0.0.1';
  readonly webOrigin = httpUrl('WEB_ORIGIN');
  readonly webOrigins = frontendOrigins(this.webOrigin);
  readonly databasePath = resolve(process.env.DATABASE_PATH ?? 'data/demoid.sqlite');
  readonly minioEndpoint = httpUrl('MINIO_ENDPOINT');
  readonly minioRegion = process.env.MINIO_REGION ?? 'us-east-1';
  readonly minioBucket = required('MINIO_BUCKET');
  readonly minioAccessKey = required('MINIO_ACCESS_KEY');
  readonly minioSecretKey = required('MINIO_SECRET_KEY');
  readonly deepfaceBaseUrl = httpUrl('DEEPFACE_BASE_URL', 'http://127.0.0.1:8000');
  readonly deepfaceTimeoutMs = integer('DEEPFACE_TIMEOUT_MS', 30000, 1, 300000);
}
