import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
export function fail(status: number, code: string, message: string): never {
  throw new HttpException({ code, message }, status);
}
export function unavailable(): never {
  return fail(503, 'SERVICE_UNAVAILABLE', 'Verification is temporarily unavailable. Please try again.');
}
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      if (typeof body === 'object' && body !== null && 'code' in body) {
        response.status(status).json(body); return;
      }
      response.status(status).json({ code: status === 413 ? 'IMAGE_TOO_LARGE' : 'INVALID_REQUEST', message: status === 413 ? 'The image must be no larger than 5 MB.' : 'The request is invalid.' });
      return;
    }
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 503;
    if (status === 413) { response.status(413).json({ code: 'IMAGE_TOO_LARGE', message: 'The request is too large.' }); return; }
    if (status >= 400 && status < 500) { response.status(400).json({ code: 'INVALID_REQUEST', message: 'The request is invalid.' }); return; }
    response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Verification is temporarily unavailable. Please try again.' });
  }
}
