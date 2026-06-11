import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix column name mismatch: migrations created snake_case columns
 * but TypeORM entities expect camelCase column names.
 */
export class FixSnakeCaseColumns1779800000011 implements MigrationInterface {
  name = 'FixSnakeCaseColumns1779800000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // share_codes table
    await queryRunner.query(`ALTER TABLE share_codes RENAME COLUMN "short_code" TO "shortCode"`);
    await queryRunner.query(`ALTER TABLE share_codes RENAME COLUMN "recipe_id" TO "recipeId"`);
    await queryRunner.query(`ALTER TABLE share_codes RENAME COLUMN "qrcode_url" TO "qrcodeUrl"`);
    await queryRunner.query(`ALTER TABLE share_codes RENAME COLUMN "created_at" TO "createdAt"`);

    // meal_plans table
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "user_id" TO "userId"`);
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "plan_date" TO "planDate"`);
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "meal_type" TO "mealType"`);
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "recipe_id" TO "recipeId"`);
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "created_at" TO "createdAt"`);

    // Recreate indexes with new column names
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_share_codes_recipe_id"`);
    await queryRunner.query(`CREATE INDEX "IDX_share_codes_recipeId" ON share_codes ("recipeId")`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meal_plans_user_date`);
    await queryRunner.query(`CREATE INDEX "IDX_meal_plans_userId_planDate" ON meal_plans ("userId", "planDate")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert meal_plans
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_meal_plans_userId_planDate"`);
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "recipeId" TO "recipe_id"`);
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "mealType" TO "meal_type"`);
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "planDate" TO "plan_date"`);
    await queryRunner.query(`ALTER TABLE meal_plans RENAME COLUMN "userId" TO "user_id"`);
    await queryRunner.query(`CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, plan_date)`);

    // Revert share_codes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_share_codes_recipeId"`);
    await queryRunner.query(`ALTER TABLE share_codes RENAME COLUMN "createdAt" TO "created_at"`);
    await queryRunner.query(`ALTER TABLE share_codes RENAME COLUMN "qrcodeUrl" TO "qrcode_url"`);
    await queryRunner.query(`ALTER TABLE share_codes RENAME COLUMN "recipeId" TO "recipe_id"`);
    await queryRunner.query(`ALTER TABLE share_codes RENAME COLUMN "shortCode" TO "short_code"`);
    await queryRunner.query(`CREATE INDEX "IDX_share_codes_recipe_id" ON share_codes (recipe_id)`);
  }
}
