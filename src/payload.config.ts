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

import { searchPlugin } from '@payloadcms/plugin-search'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * URL текущего Payload CMS.
 *
 * CMS и Admin Panel работают на этом origin.
 *
 * .env:
 * NEXT_PUBLIC_APP_URL=http://localhost:4000
 */
const cmsURL =
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'

/**
 * URL frontend-приложения Next.js.
 *
 * Важно:
 * NEXT_PUBLIC_APP_URL во frontend и CMS — это разные переменные
 * в разных .env-файлах.
 *
 * CMS:
 *   NEXT_PUBLIC_APP_URL=http://localhost:4000
 *
 * WEB:
 *   NEXT_PUBLIC_APP_URL=http://localhost:3000
 */
const frontendURL =
  process.env.FRONTEND_URL || 'http://localhost:3000'

/**
 * Origin'ы, которым Payload разрешает обращаться к API.
 *
 * CMS нужен для Admin Panel.
 * Frontend нужен для авторизации и API-запросов с web-приложения.
 */
const allowedOrigins = [
  cmsURL,
  frontendURL,

  // Production:
  // process.env.FRONTEND_URL_PRODUCTION,
].filter(Boolean)

export default buildConfig({
  /**
   * Основной URL Payload.
   *
   * Важно для Admin Panel и server-side операций Payload.
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
   */
  cors: allowedOrigins,

  /**
   * Разрешаем cookie-based запросы от CMS и frontend.
   */
  csrf: allowedOrigins,
})