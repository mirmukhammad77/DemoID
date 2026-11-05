import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import type { Response } from 'express';
import { ApplicationError, ApplicationErrorCode } from '../errors/application.error';

const statuses: Record<ApplicationErrorCode, number> = {
  INVALID_IMAGE: 400, IMAGE_TOO_LARGE: 413, INVALID_FACE: 422,
  FACE_MISMATCH: 401, INVALID_CREDENTIALS: 401, EMAIL_CONFLICT: 409, SERVICE_UNAVAILABLE: 503,
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof ApplicationError) {
      response.status(statuses[error.code]).json({ code: error.code, message: error.message });
      return;
    }
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const body = error.getResponse();
      if (typeof body === 'object' && body !== null && 'code' in body && body.code === 'VALIDATION_ERROR') {
        response.status(status).json(body);
        return;
      }
      response.status(status).json({ code: status === 413 ? 'IMAGE_TOO_LARGE' : 'INVALID_REQUEST',
        message: status === 413 ? 'The image must be no larger than 5 MB.' : 'The request is invalid.' });
      return;
    }
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 503;
    if (status === 413) {
      response.status(413).json({ code: 'IMAGE_TOO_LARGE', message: 'The request is too large.' });
    } else if (status >= 400 && status < 500) {
      response.status(400).json({ code: 'INVALID_REQUEST', message: 'The request is invalid.' });
    } else {
      response.status(503).json({ code: 'SERVICE_UNAVAILABLE', message: 'Verification is temporarily unavailable. Please try again.' });
    }
  }
}
