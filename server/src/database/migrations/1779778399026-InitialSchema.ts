import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1779778399026 implements MigrationInterface {
    name = 'InitialSchema1779778399026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recipe_ingredients" ALTER COLUMN "scaleFactor" SET DEFAULT '0.7'`);
        await queryRunner.query(`ALTER TABLE "cooking_log_costs" ALTER COLUMN "totalCost" SET DEFAULT '0.00'`);
        await queryRunner.query(`ALTER TABLE "cooking_logs" ALTER COLUMN "totalCost" SET DEFAULT '0.00'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cooking_logs" ALTER COLUMN "totalCost" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "cooking_log_costs" ALTER COLUMN "totalCost" SET DEFAULT 0.00`);
        await queryRunner.query(`ALTER TABLE "recipe_ingredients" ALTER COLUMN "scaleFactor" SET DEFAULT 0.7`);
    }

}
