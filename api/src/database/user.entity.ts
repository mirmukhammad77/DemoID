import { Column, Entity, PrimaryColumn } from 'typeorm';
@Entity('users')
export class User {
  @PrimaryColumn('text') id!: string;
  @Column({ type: 'text', unique: true }) email!: string;
  @Column('text') passwordHash!: string;
  @Column('text') firstName!: string;
  @Column('text') lastName!: string;
  @Column('text') birthDate!: string;
  @Column({ type: 'text', unique: true }) faceObjectKey!: string;
  @Column('text') createdAt!: string;
}
export function profileOf(user: User) {
  return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, birthDate: user.birthDate };
}
