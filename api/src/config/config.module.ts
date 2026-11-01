import { Global, Injectable, Module } from '@nestjs/common';
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
function httpUrl(name: string): string {
  const value = required(name);
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Invalid configuration: ' + name);
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
  readonly awsRegion = required('AWS_REGION');
  readonly similarityThreshold = integer('FACE_SIMILARITY_THRESHOLD', 95, 0, 100);
}
@Global()
@Module({ providers: [AppConfig], exports: [AppConfig] })
export class ConfigModule {}
