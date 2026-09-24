import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { s3Storage } from '@payloadcms/storage-s3'

import { Users } from './collections/users/config'
import { Media } from './collections/media/config'
import { s3StorageOptions } from './lib/storage/s3'
import { Genres } from './collections/genres/config'
import { Content } from './collections/content/config'
import { Episodes } from './collections/episodes/config'
import { Favorites } from './collections/favorites/config'
import { Seasons } from './collections/seasons/config'
// [Dokploy] Миграции БД (генерируются `pnpm migrate:create`) — в production
// схема разворачивается ими, а не Drizzle push.
import { migrations } from './migrations'
// [Dokploy] URL CMS/frontend и список CORS/CSRF-origin'ов теперь читаются из
// runtime-переменных CMS_URL / FRONTEND_URL (см. src/lib/urls.ts). Раньше эти
// значения были захардкожены на localhost и NEXT_PUBLIC_APP_URL.
import { allowedOrigins, cmsURL } from './lib/urls'

import { searchPlugin } from '@payloadcms/plugin-search'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  /**
   * Основной URL Payload.
   *
   * Важно для Admin Panel и server-side операций Payload.
   *
   * [Dokploy] В production = CMS_URL (https://cms.otakuum.ru).
   */
  serverURL: cmsURL,

  admin: {
    user: Users.slug,

    importMap: {
      baseDir: path.resolve(dirname),
    },
  },

  collections: [
    Users,
    Media,
    Genres,
    Content,
    Episodes,
    Favorites,
    Seasons,
  ],
  

  editor: lexicalEditor(),

  secret: process.env.PAYLOAD_SECRET || '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },

    // [Dokploy] В production (NODE_ENV=production) Drizzle push отключён, поэтому схема
    // БД разворачивается миграциями из src/migrations. prodMigrations
    // применяет ещё не выполненные миграции автоматически при старте
    // контейнера — отдельный шаг `payload migrate` в Dokploy не нужен.
    // В dev-режиме по-прежнему работает push.
    prodMigrations: migrations,
  }),

  // Приведение типа намеренное: между версиями `sharp` (0.34.x/0.35.x) и
  // типом `SharpDependency`, который ожидает Payload 3.87.1, разошлись
  // сигнатуры перегрузок конструктора — это чисто типовое несовпадение,
  // на рантайм не влияет (sharp как функция работает так же). Если после
  // обновления Payload/@payloadcms/* ошибка исчезнет сама — каст можно убрать.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sharp: sharp as any,

  endpoints: [],

  plugins: [
    s3Storage(s3StorageOptions),
    searchPlugin({
      collections: ['content'], // slug коллекции, которую индексируем
searchOverrides: {
  slug: 'search-results',
  fields: ({ defaultFields }) => [
    ...defaultFields,
    { name: 'titleEn', type: 'text' },
    { name: 'slug', type: 'text' },
    { name: 'type', type: 'text' },
    { name: 'releaseYear', type: 'number' },
    { name: 'rating', type: 'number' },
    { name: 'poster', type: 'upload', relationTo: 'media' },
  ],
},
beforeSync: ({ originalDoc, searchDoc }) => ({
  ...searchDoc,
  title: originalDoc.titleRu,
  titleEn: originalDoc.titleEn,
  slug: originalDoc.slug,
  type: originalDoc.type,
  releaseYear: originalDoc.releaseYear,
  rating: originalDoc.rating,
  poster: originalDoc.poster,
}),
    }),
  ],

  /**
   * Разрешаем запросы от CMS Admin Panel и frontend.
   *
   * [Dokploy] Список собирается в src/lib/urls.ts: CMS_URL + FRONTEND_URL.
   * В production localhost в список не попадает.
   */
  cors: allowedOrigins,

  /**
   * Разрешаем cookie-based запросы от CMS и frontend.
   */
  csrf: allowedOrigins,
})