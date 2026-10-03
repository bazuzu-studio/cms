import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { s3Storage } from '@payloadcms/storage-s3'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'

import { Users } from './collections/users/config'
import { Media } from './collections/media/config'
import { s3StorageOptions } from './lib/storage/s3'
// [Dokploy] Почта (сброс пароля, приглашения и т.д.) через SMTP. Если
// SMTP_HOST не задан — email остаётся undefined, и Payload по умолчанию
// просто логирует предупреждение вместо реальной отправки (см. документацию
// Payload Email). Так dev-окружение без почтового сервера не падает.
import { getNodemailerOptions, isEmailConfigured } from './lib/email/nodemailer'
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
import { contactMessageEndpoint } from './endpoints/contact-message'
import { healthEndpoint } from './endpoints/health'

import { searchPlugin } from '@payloadcms/plugin-search'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Пустой секрет раньше молча проходил (`|| ''`) — JWT подписывались пустым
// ключом. В production падаем сразу; на этапе `next build` переменных ещё нет
// (см. комментарий в lib/storage/s3.ts), поэтому его пропускаем.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'
if (process.env.NODE_ENV === 'production' && !isBuildPhase && !process.env.PAYLOAD_SECRET?.trim()) {
  throw new Error('Missing required environment variable: PAYLOAD_SECRET')
}

// GraphQL Playground и интроспекция — только по явному флагу (нужны, чтобы
// выполнить `pnpm codegen` фронтенда против production-схемы; обычно проще
// запускать codegen против локальной CMS).
const graphqlIntrospection = process.env.GRAPHQL_INTROSPECTION === 'true'

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

  collections: [Users, Media, Genres, Content, Episodes, Favorites, Seasons],

  // [Dokploy] Включаем только если заданы SMTP_* — иначе оставляем Payload
  // работать в дефолтном режиме (лог предупреждения вместо отправки).
  email: isEmailConfigured ? nodemailerAdapter(getNodemailerOptions()) : undefined,

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

  // /api/contact-message — форма обратной связи с apps/web, шлёт письмо
  // через email-адаптер выше (см. src/endpoints/contact-message.ts).
  endpoints: [contactMessageEndpoint, healthEndpoint],

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
   * GraphQL-настройки.
   *
   * В production Playground и интроспекция выключены, если не задано
   * GRAPHQL_INTROSPECTION=true. maxComplexity ограничивает «дорогие»
   * вложенные запросы (значение по умолчанию Payload — 1000, задано явно).
   */
  graphQL: {
    disablePlaygroundInProduction: !graphqlIntrospection,
    disableIntrospectionInProduction: !graphqlIntrospection,
    maxComplexity: 1000,
  },

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
