import { Injectable } from '@nestjs/common';
import { unavailable } from '../../../shared/errors/application.error';
import { AppConfig } from '../../config/config.service';
import { DeepFaceResult } from '../types/deepface-result.type';

const MAX_RESPONSE_BYTES = 65_536;
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const distance = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 2;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnly(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

@Injectable()
export class DeepFaceClient {
  constructor(private readonly config: AppConfig) {}

  private async post(path: string, payload: Record<string, string>): Promise<unknown> {
    try {
      const response = await fetch(this.config.deepfaceBaseUrl + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        redirect: 'error', signal: AbortSignal.timeout(this.config.deepfaceTimeoutMs),
      });
      if (response.status !== 200 || !response.headers.get('content-type')?.startsWith('application/json') || !response.body) {
        await response.body?.cancel();
        return unavailable();
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > MAX_RESPONSE_BYTES) return unavailable();
          chunks.push(value);
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    } catch {
      return unavailable();
    }
  }

  async detect(image: Buffer): Promise<number> {
    const result = await this.post('/detect', { imageBase64: image.toString('base64') });
    if (!record(result) || !hasOnly(result, ['faceCount']) || !count(result.faceCount)) return unavailable();
    return result.faceCount;
  }

  async compare(reference: Buffer, candidate: Buffer): Promise<DeepFaceResult> {
    const result = await this.post('/compare', {
      referenceBase64: reference.toString('base64'), candidateBase64: candidate.toString('base64'),
    });
    if (!record(result) || !count(result.referenceFaceCount) || !count(result.candidateFaceCount)) return unavailable();
    if (result.status === 'invalid_faces') {
      if (!hasOnly(result, ['status', 'referenceFaceCount', 'candidateFaceCount'])
        || (result.referenceFaceCount === 1 && result.candidateFaceCount === 1)) return unavailable();
      return { status: 'invalid_faces', referenceFaceCount: result.referenceFaceCount, candidateFaceCount: result.candidateFaceCount };
    }
    if (result.status !== 'compared' || !hasOnly(result, [
      'status', 'referenceFaceCount', 'candidateFaceCount', 'distance', 'threshold', 'verified', 'model', 'detector', 'metric',
    ]) || result.referenceFaceCount !== 1 || result.candidateFaceCount !== 1
      || !distance(result.distance) || !distance(result.threshold)
      || typeof result.verified !== 'boolean' || result.verified !== (result.distance <= result.threshold)
      || result.model !== 'VGG-Face' || result.detector !== 'opencv' || result.metric !== 'cosine') return unavailable();
    return { status: 'compared', referenceFaceCount: 1, candidateFaceCount: 1,
      distance: result.distance, threshold: result.threshold, verified: result.verified,
      model: result.model, detector: result.detector, metric: result.metric };
  }
}
