import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'pastDateOnly', async: false })
export class PastDateOnly implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00.000Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
      && value < new Date().toISOString().slice(0, 10);
  }
  defaultMessage() { return 'birthDate must be a real past date in YYYY-MM-DD format'; }
}
