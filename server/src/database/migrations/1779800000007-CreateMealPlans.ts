import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMealPlans1779800000007 implements MigrationInterface {
  name = 'CreateMealPlans1779800000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE meal_plans (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_date    DATE NOT NULL,
        meal_type    VARCHAR(20) NOT NULL,
        recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        servings     DECIMAL(6,2) NOT NULL DEFAULT 1,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, plan_date, meal_type, recipe_id)
      );
    `);
    await queryRunner.query(`
      CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, plan_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_meal_plans_user_date;`);
    await queryRunner.query(`DROP TABLE IF EXISTS meal_plans;`);
  }
}
