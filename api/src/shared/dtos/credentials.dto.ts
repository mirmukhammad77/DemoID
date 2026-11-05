import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../utils/validation.util';

export class CredentialsDto {
  @NormalizeEmail() @IsEmail() @MaxLength(254)
  email!: string;

  @IsString() @MinLength(8) @MaxLength(128)
  password!: string;
}
