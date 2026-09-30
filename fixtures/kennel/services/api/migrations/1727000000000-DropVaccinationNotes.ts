import { MigrationInterface, QueryRunner } from "typeorm";

// The vet records service holds vaccinations now, so the notes staff typed in aren't needed.
export class DropVaccinationNotes1727000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN "vaccination_notes"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" ADD COLUMN "vaccination_notes" text`);
  }
}
