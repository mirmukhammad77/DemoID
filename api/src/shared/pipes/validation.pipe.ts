import { HttpException, ValidationPipe } from '@nestjs/common';

export function validationPipe() {
  return new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true,
    validationError: { target: false, value: false },
    exceptionFactory: (errors) => new HttpException({
      code: 'VALIDATION_ERROR', message: 'Please check the submitted fields.',
      fields: Object.fromEntries(errors.map(error => [error.property, Object.values(error.constraints ?? {})])),
    }, 400),
  });
}
