import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1719800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "owners" (
        "id" SERIAL PRIMARY KEY,
        "email" text NOT NULL UNIQUE,
        "name" text NOT NULL,
        "phone" text NOT NULL,
        "passwordHash" text NOT NULL
      )`);
    await queryRunner.query(`
      CREATE TABLE "bookings" (
        "id" SERIAL PRIMARY KEY,
        "ownerId" integer NOT NULL REFERENCES "owners" ("id"),
        "dogName" text NOT NULL,
        "microchip" text NOT NULL,
        "checkIn" date NOT NULL,
        "checkOut" date NOT NULL,
        "total" double precision NOT NULL,
        "paid" boolean NOT NULL DEFAULT false,
        "vaccination_notes" text
      )`);
    await queryRunner.query(`
      CREATE TABLE "updates" (
        "id" SERIAL PRIMARY KEY,
        "bookingId" integer NOT NULL REFERENCES "bookings" ("id"),
        "note" text NOT NULL,
        "photoPath" text,
        "postedAt" timestamptz NOT NULL DEFAULT now()
      )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "updates"`);
    await queryRunner.query(`DROP TABLE "bookings"`);
    await queryRunner.query(`DROP TABLE "owners"`);
  }
}
