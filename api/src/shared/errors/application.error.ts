export type ApplicationErrorCode =
  | 'INVALID_IMAGE' | 'IMAGE_TOO_LARGE' | 'INVALID_FACE' | 'FACE_MISMATCH'
  | 'INVALID_CREDENTIALS' | 'EMAIL_CONFLICT' | 'SERVICE_UNAVAILABLE';

export class ApplicationError extends Error {
  constructor(readonly code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export function fail(code: ApplicationErrorCode, message: string): never {
  throw new ApplicationError(code, message);
}

export function unavailable(): never {
  return fail('SERVICE_UNAVAILABLE', 'Verification is temporarily unavailable. Please try again.');
}
