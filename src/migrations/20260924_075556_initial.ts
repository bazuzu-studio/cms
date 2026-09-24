import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'editor', 'user');
  CREATE TYPE "public"."enum_content_type" AS ENUM('movie', 'series');
  CREATE TYPE "public"."enum_content_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__content_v_version_type" AS ENUM('movie', 'series');
  CREATE TYPE "public"."enum__content_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"avatar_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"_objectkey" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "genres" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_content_type",
  	"title_en" varchar,
  	"title_ru" varchar,
  	"original_title" varchar,
  	"slug" varchar,
  	"description" jsonb,
  	"kinopoisk_id" varchar,
  	"shikimori_id" varchar,
  	"kodik_id" varchar,
  	"release_year" numeric,
  	"duration" numeric,
  	"rating" numeric,
  	"player_link" varchar,
  	"age_rating" numeric,
  	"poster_id" integer,
  	"backdrop_id" integer,
  	"status" "enum_content_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_content_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "content_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"genres_id" integer
  );
  
  CREATE TABLE "_content_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_type" "enum__content_v_version_type",
  	"version_title_en" varchar,
  	"version_title_ru" varchar,
  	"version_original_title" varchar,
  	"version_slug" varchar,
  	"version_description" jsonb,
  	"version_kinopoisk_id" varchar,
  	"version_shikimori_id" varchar,
  	"version_kodik_id" varchar,
  	"version_release_year" numeric,
  	"version_duration" numeric,
  	"version_rating" numeric,
  	"version_player_link" varchar,
  	"version_age_rating" numeric,
  	"version_poster_id" integer,
  	"version_backdrop_id" integer,
  	"version_status" "enum__content_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__content_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_content_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"genres_id" integer
  );
  
  CREATE TABLE "episodes" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"season_id" integer NOT NULL,
  	"episode_number" numeric NOT NULL,
  	"title" varchar DEFAULT 'Эпизод' NOT NULL,
  	"player_link" varchar,
  	"description" jsonb,
  	"duration" numeric,
  	"airing_at" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "favorites" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"content_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "seasons" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"content_id" integer NOT NULL,
  	"season_number" numeric NOT NULL,
  	"title" varchar,
  	"release_year" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "search_results" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"priority" numeric,
  	"title_en" varchar,
  	"slug" varchar,
  	"type" varchar,
  	"release_year" numeric,
  	"rating" numeric,
  	"poster_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "search_results_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"content_id" integer
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"genres_id" integer,
  	"content_id" integer,
  	"episodes_id" integer,
  	"favorites_id" integer,
  	"seasons_id" integer,
  	"search_results_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content" ADD CONSTRAINT "content_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content" ADD CONSTRAINT "content_backdrop_id_media_id_fk" FOREIGN KEY ("backdrop_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_rels" ADD CONSTRAINT "content_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_rels" ADD CONSTRAINT "content_rels_genres_fk" FOREIGN KEY ("genres_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_content_v" ADD CONSTRAINT "_content_v_parent_id_content_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."content"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_content_v" ADD CONSTRAINT "_content_v_version_poster_id_media_id_fk" FOREIGN KEY ("version_poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_content_v" ADD CONSTRAINT "_content_v_version_backdrop_id_media_id_fk" FOREIGN KEY ("version_backdrop_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_content_v_rels" ADD CONSTRAINT "_content_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_content_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_content_v_rels" ADD CONSTRAINT "_content_v_rels_genres_fk" FOREIGN KEY ("genres_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "seasons" ADD CONSTRAINT "seasons_content_id_content_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "search_results" ADD CONSTRAINT "search_results_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "search_results_rels" ADD CONSTRAINT "search_results_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."search_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_results_rels" ADD CONSTRAINT "search_results_rels_content_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_genres_fk" FOREIGN KEY ("genres_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_episodes_fk" FOREIGN KEY ("episodes_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_favorites_fk" FOREIGN KEY ("favorites_id") REFERENCES "public"."favorites"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_seasons_fk" FOREIGN KEY ("seasons_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_results_fk" FOREIGN KEY ("search_results_id") REFERENCES "public"."search_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_avatar_idx" ON "users" USING btree ("avatar_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "genres_title_idx" ON "genres" USING btree ("title");
  CREATE UNIQUE INDEX "genres_slug_idx" ON "genres" USING btree ("slug");
  CREATE INDEX "genres_updated_at_idx" ON "genres" USING btree ("updated_at");
  CREATE INDEX "genres_created_at_idx" ON "genres" USING btree ("created_at");
  CREATE UNIQUE INDEX "content_title_en_idx" ON "content" USING btree ("title_en");
  CREATE INDEX "content_title_ru_idx" ON "content" USING btree ("title_ru");
  CREATE UNIQUE INDEX "content_slug_idx" ON "content" USING btree ("slug");
  CREATE INDEX "content_kinopoisk_id_idx" ON "content" USING btree ("kinopoisk_id");
  CREATE INDEX "content_shikimori_id_idx" ON "content" USING btree ("shikimori_id");
  CREATE INDEX "content_kodik_id_idx" ON "content" USING btree ("kodik_id");
  CREATE INDEX "content_poster_idx" ON "content" USING btree ("poster_id");
  CREATE INDEX "content_backdrop_idx" ON "content" USING btree ("backdrop_id");
  CREATE INDEX "content_updated_at_idx" ON "content" USING btree ("updated_at");
  CREATE INDEX "content_created_at_idx" ON "content" USING btree ("created_at");
  CREATE INDEX "content__status_idx" ON "content" USING btree ("_status");
  CREATE INDEX "content_rels_order_idx" ON "content_rels" USING btree ("order");
  CREATE INDEX "content_rels_parent_idx" ON "content_rels" USING btree ("parent_id");
  CREATE INDEX "content_rels_path_idx" ON "content_rels" USING btree ("path");
  CREATE INDEX "content_rels_genres_id_idx" ON "content_rels" USING btree ("genres_id");
  CREATE INDEX "_content_v_parent_idx" ON "_content_v" USING btree ("parent_id");
  CREATE INDEX "_content_v_version_version_title_en_idx" ON "_content_v" USING btree ("version_title_en");
  CREATE INDEX "_content_v_version_version_title_ru_idx" ON "_content_v" USING btree ("version_title_ru");
  CREATE INDEX "_content_v_version_version_slug_idx" ON "_content_v" USING btree ("version_slug");
  CREATE INDEX "_content_v_version_version_kinopoisk_id_idx" ON "_content_v" USING btree ("version_kinopoisk_id");
  CREATE INDEX "_content_v_version_version_shikimori_id_idx" ON "_content_v" USING btree ("version_shikimori_id");
  CREATE INDEX "_content_v_version_version_kodik_id_idx" ON "_content_v" USING btree ("version_kodik_id");
  CREATE INDEX "_content_v_version_version_poster_idx" ON "_content_v" USING btree ("version_poster_id");
  CREATE INDEX "_content_v_version_version_backdrop_idx" ON "_content_v" USING btree ("version_backdrop_id");
  CREATE INDEX "_content_v_version_version_updated_at_idx" ON "_content_v" USING btree ("version_updated_at");
  CREATE INDEX "_content_v_version_version_created_at_idx" ON "_content_v" USING btree ("version_created_at");
  CREATE INDEX "_content_v_version_version__status_idx" ON "_content_v" USING btree ("version__status");
  CREATE INDEX "_content_v_created_at_idx" ON "_content_v" USING btree ("created_at");
  CREATE INDEX "_content_v_updated_at_idx" ON "_content_v" USING btree ("updated_at");
  CREATE INDEX "_content_v_latest_idx" ON "_content_v" USING btree ("latest");
  CREATE INDEX "_content_v_rels_order_idx" ON "_content_v_rels" USING btree ("order");
  CREATE INDEX "_content_v_rels_parent_idx" ON "_content_v_rels" USING btree ("parent_id");
  CREATE INDEX "_content_v_rels_path_idx" ON "_content_v_rels" USING btree ("path");
  CREATE INDEX "_content_v_rels_genres_id_idx" ON "_content_v_rels" USING btree ("genres_id");
  CREATE INDEX "episodes_season_idx" ON "episodes" USING btree ("season_id");
  CREATE INDEX "episodes_updated_at_idx" ON "episodes" USING btree ("updated_at");
  CREATE INDEX "episodes_created_at_idx" ON "episodes" USING btree ("created_at");
  CREATE INDEX "favorites_user_idx" ON "favorites" USING btree ("user_id");
  CREATE INDEX "favorites_content_idx" ON "favorites" USING btree ("content_id");
  CREATE INDEX "favorites_updated_at_idx" ON "favorites" USING btree ("updated_at");
  CREATE INDEX "favorites_created_at_idx" ON "favorites" USING btree ("created_at");
  CREATE INDEX "seasons_content_idx" ON "seasons" USING btree ("content_id");
  CREATE INDEX "seasons_updated_at_idx" ON "seasons" USING btree ("updated_at");
  CREATE INDEX "seasons_created_at_idx" ON "seasons" USING btree ("created_at");
  CREATE INDEX "search_results_poster_idx" ON "search_results" USING btree ("poster_id");
  CREATE INDEX "search_results_updated_at_idx" ON "search_results" USING btree ("updated_at");
  CREATE INDEX "search_results_created_at_idx" ON "search_results" USING btree ("created_at");
  CREATE INDEX "search_results_rels_order_idx" ON "search_results_rels" USING btree ("order");
  CREATE INDEX "search_results_rels_parent_idx" ON "search_results_rels" USING btree ("parent_id");
  CREATE INDEX "search_results_rels_path_idx" ON "search_results_rels" USING btree ("path");
  CREATE INDEX "search_results_rels_content_id_idx" ON "search_results_rels" USING btree ("content_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_genres_id_idx" ON "payload_locked_documents_rels" USING btree ("genres_id");
  CREATE INDEX "payload_locked_documents_rels_content_id_idx" ON "payload_locked_documents_rels" USING btree ("content_id");
  CREATE INDEX "payload_locked_documents_rels_episodes_id_idx" ON "payload_locked_documents_rels" USING btree ("episodes_id");
  CREATE INDEX "payload_locked_documents_rels_favorites_id_idx" ON "payload_locked_documents_rels" USING btree ("favorites_id");
  CREATE INDEX "payload_locked_documents_rels_seasons_id_idx" ON "payload_locked_documents_rels" USING btree ("seasons_id");
  CREATE INDEX "payload_locked_documents_rels_search_results_id_idx" ON "payload_locked_documents_rels" USING btree ("search_results_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "genres" CASCADE;
  DROP TABLE "content" CASCADE;
  DROP TABLE "content_rels" CASCADE;
  DROP TABLE "_content_v" CASCADE;
  DROP TABLE "_content_v_rels" CASCADE;
  DROP TABLE "episodes" CASCADE;
  DROP TABLE "favorites" CASCADE;
  DROP TABLE "seasons" CASCADE;
  DROP TABLE "search_results" CASCADE;
  DROP TABLE "search_results_rels" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_content_type";
  DROP TYPE "public"."enum_content_status";
  DROP TYPE "public"."enum__content_v_version_type";
  DROP TYPE "public"."enum__content_v_version_status";`)
}
