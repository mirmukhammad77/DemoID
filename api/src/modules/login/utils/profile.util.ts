import { User } from '../../users/entity/user.entity';

export function profileOf(user: User) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, birthDate: user.birthDate };
}
