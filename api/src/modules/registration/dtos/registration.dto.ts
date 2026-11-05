import { IsString, MaxLength, MinLength, Validate } from 'class-validator';
import { CredentialsDto } from '../../../shared/dtos/credentials.dto';
import { Trim } from '../utils/trim.util';
import { PastDateOnly } from '../validators/past-date.validator';

export class RegistrationDto extends CredentialsDto {
  @Trim() @IsString() @MinLength(1) @MaxLength(100)
  firstName!: string;

  @Trim() @IsString() @MinLength(1) @MaxLength(100)
  lastName!: string;

  @IsString() @Validate(PastDateOnly)
  birthDate!: string;
}
