import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateShareCodes1779800000006 implements MigrationInterface {
  name = 'CreateShareCodes1779800000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "share_codes" (
        "id"          SERIAL PRIMARY KEY,
        "short_code"  VARCHAR(32) NOT NULL,
        "recipe_id"   UUID NOT NULL REFERENCES "recipes"("id") ON DELETE CASCADE,
        "qrcode_url"  VARCHAR(512),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_share_codes_short_code" UNIQUE ("short_code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_share_codes_recipe_id" ON "share_codes" ("recipe_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "share_codes"`);
  }
}
