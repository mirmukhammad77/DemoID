import { HttpException, ValidationPipe } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
export const Trim = () => Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value);
const NormalizeEmail = () => Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value);
@ValidatorConstraint({ name: 'pastDateOnly', async: false })
class PastDateOnly implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00.000Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value < new Date().toISOString().slice(0, 10);
  }
  defaultMessage() { return 'birthDate must be a real past date in YYYY-MM-DD format'; }
}
export class CredentialsDto {
  @NormalizeEmail() @IsEmail() @MaxLength(254)
  email!: string;
  @IsString() @MinLength(8) @MaxLength(128)
  password!: string;
}
export class RegistrationDto extends CredentialsDto {
  @Trim() @IsString() @MinLength(1) @MaxLength(100)
  firstName!: string;
  @Trim() @IsString() @MinLength(1) @MaxLength(100)
  lastName!: string;
  @IsString() @Validate(PastDateOnly)
  birthDate!: string;
}
export function validationPipe() {
  return new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true, validationError: { target: false, value: false }, exceptionFactory: (errors) => new HttpException({ code: 'VALIDATION_ERROR', message: 'Please check the submitted fields.', fields: Object.fromEntries(errors.map(error => [error.property, Object.values(error.constraints ?? {})])) }, 400) });
}
