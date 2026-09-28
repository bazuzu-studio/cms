import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Статус релиза (content.releaseStatus): anons / ongoing / released.
 *
 * Миграция идемпотентна: если колонки release_status уже были созданы вручную
 * (например, как VARCHAR по инструкции из kodik-pipeline), они не задваиваются,
 * а приводятся к enum; значения вне списка при этом обнуляются.
 * Снимок схемы (.json рядом) сгенерирован `payload migrate:create`.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_content_release_status" AS ENUM('anons', 'ongoing', 'released');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  DO $$ BEGIN
    CREATE TYPE "public"."enum__content_v_version_release_status" AS ENUM('anons', 'ongoing', 'released');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

  ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "release_status" "enum_content_release_status";
  ALTER TABLE "_content_v" ADD COLUMN IF NOT EXISTS "version_release_status" "enum__content_v_version_release_status";

  DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'content'
        AND column_name = 'release_status' AND data_type <> 'USER-DEFINED'
    ) THEN
      UPDATE "content" SET "release_status" = NULL
        WHERE "release_status"::text NOT IN ('anons', 'ongoing', 'released');
      ALTER TABLE "content" ALTER COLUMN "release_status"
        TYPE "enum_content_release_status" USING "release_status"::text::"enum_content_release_status";
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '_content_v'
        AND column_name = 'version_release_status' AND data_type <> 'USER-DEFINED'
    ) THEN
      UPDATE "_content_v" SET "version_release_status" = NULL
        WHERE "version_release_status"::text NOT IN ('anons', 'ongoing', 'released');
      ALTER TABLE "_content_v" ALTER COLUMN "version_release_status"
        TYPE "enum__content_v_version_release_status" USING "version_release_status"::text::"enum__content_v_version_release_status";
    END IF;
  END $$;

  CREATE INDEX IF NOT EXISTS "content_release_status_idx" ON "content" USING btree ("release_status");
  CREATE INDEX IF NOT EXISTS "_content_v_version_version_release_status_idx" ON "_content_v" USING btree ("version_release_status");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "content_release_status_idx";
  DROP INDEX IF EXISTS "_content_v_version_version_release_status_idx";
  ALTER TABLE "content" DROP COLUMN IF EXISTS "release_status";
  ALTER TABLE "_content_v" DROP COLUMN IF EXISTS "version_release_status";
  DROP TYPE IF EXISTS "public"."enum_content_release_status";
  DROP TYPE IF EXISTS "public"."enum__content_v_version_release_status";`)
}
