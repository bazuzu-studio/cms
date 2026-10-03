import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * - content.franchise_id: идентификатор франшизы (сезоны одного сериала);
 *   для существующих записей = kinopoisk_id, т.е. поведение сайта не меняется.
 * - Индексы под фильтры/сортировки каталога: type, release_year, rating.
 * - titleEn больше не unique (ремейки и одноимённые тайтлы): индекс
 *   content_title_en_idx пересоздаётся как обычный.
 * - Все существующие записи content помечаются опубликованными: публичное
 *   чтение теперь отдаёт только _status = 'published'. Иначе записи, которые
 *   пайплайн вставил напрямую в БД с DEFAULT 'draft', пропали бы с сайта.
 * - favorites: удаление дублей и уникальный индекс (user_id, content_id)
 *   против гонки двух запросов. Индекс не описан в схеме Payload, поэтому
 *   в снимке .json его нет — это нормально.
 *
 * Миграция идемпотентна (IF NOT EXISTS / IF EXISTS).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "content" ADD COLUMN IF NOT EXISTS "franchise_id" varchar;
   ALTER TABLE "_content_v" ADD COLUMN IF NOT EXISTS "version_franchise_id" varchar;

   UPDATE "content" SET "franchise_id" = "kinopoisk_id"
     WHERE "franchise_id" IS NULL AND "kinopoisk_id" IS NOT NULL;

   DROP INDEX IF EXISTS "content_title_en_idx";
   CREATE INDEX IF NOT EXISTS "content_title_en_idx" ON "content" USING btree ("title_en");

   CREATE INDEX IF NOT EXISTS "content_type_idx" ON "content" USING btree ("type");
   CREATE INDEX IF NOT EXISTS "content_release_year_idx" ON "content" USING btree ("release_year");
   CREATE INDEX IF NOT EXISTS "content_rating_idx" ON "content" USING btree ("rating");
   CREATE INDEX IF NOT EXISTS "content_franchise_id_idx" ON "content" USING btree ("franchise_id");

   CREATE INDEX IF NOT EXISTS "_content_v_version_version_type_idx" ON "_content_v" USING btree ("version_type");
   CREATE INDEX IF NOT EXISTS "_content_v_version_version_release_year_idx" ON "_content_v" USING btree ("version_release_year");
   CREATE INDEX IF NOT EXISTS "_content_v_version_version_rating_idx" ON "_content_v" USING btree ("version_rating");
   CREATE INDEX IF NOT EXISTS "_content_v_version_version_franchise_id_idx" ON "_content_v" USING btree ("version_franchise_id");

   UPDATE "content" SET "_status" = 'published' WHERE "_status" IS DISTINCT FROM 'published';

   DELETE FROM "favorites" a USING "favorites" b
     WHERE a."user_id" = b."user_id" AND a."content_id" = b."content_id" AND a."id" > b."id";
   CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_content_unique" ON "favorites" USING btree ("user_id", "content_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX IF EXISTS "favorites_user_content_unique";

   DROP INDEX IF EXISTS "_content_v_version_version_franchise_id_idx";
   DROP INDEX IF EXISTS "_content_v_version_version_rating_idx";
   DROP INDEX IF EXISTS "_content_v_version_version_release_year_idx";
   DROP INDEX IF EXISTS "_content_v_version_version_type_idx";

   DROP INDEX IF EXISTS "content_franchise_id_idx";
   DROP INDEX IF EXISTS "content_rating_idx";
   DROP INDEX IF EXISTS "content_release_year_idx";
   DROP INDEX IF EXISTS "content_type_idx";

   DROP INDEX IF EXISTS "content_title_en_idx";
   CREATE UNIQUE INDEX IF NOT EXISTS "content_title_en_idx" ON "content" USING btree ("title_en");

   ALTER TABLE "_content_v" DROP COLUMN IF EXISTS "version_franchise_id";
   ALTER TABLE "content" DROP COLUMN IF EXISTS "franchise_id";`)
}
