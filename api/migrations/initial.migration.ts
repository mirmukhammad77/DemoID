import type { MigrationInterface, QueryRunner } from 'typeorm';
export class InitialUsers1793520000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE TABLE "users" ("id" text PRIMARY KEY NOT NULL, "email" text NOT NULL UNIQUE, "passwordHash" text NOT NULL, "firstName" text NOT NULL, "lastName" text NOT NULL, "birthDate" text NOT NULL, "faceObjectKey" text NOT NULL UNIQUE, "createdAt" text NOT NULL)');
  }
  async down(queryRunner: QueryRunner): Promise<void> { await queryRunner.query('DROP TABLE "users"'); }
}
