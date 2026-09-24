import type { S3StorageOptions } from '@payloadcms/storage-s3'

/**
 * `next build` выполняется в Docker/Dokploy на этапе сборки образа, где
 * runtime-переменных (S3_*, DATABASE_URL, ...) обычно ещё нет — они
 * подставляются только при запуске контейнера. Поэтому на этапе сборки
 * не падаем, а используем заглушки; в рантайме проверка остаётся строгой.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

/**
 * Достаёт обязательную переменную окружения и падает с понятной ошибкой,
 * если она не задана — лучше уронить старт CMS сразу, чем ловить
 * непонятные ошибки S3 в рантайме из-за пустого bucket/endpoint.
 */
const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim()

  if (!value) {
    if (isBuildPhase) return `build-placeholder-${name.toLowerCase()}`

    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

// Публичный URL, по которому отдаются файлы (например, http://localhost:9000/media
// для локального MinIO или https://cms.otakuum.ru/media в продакшене на Dokploy). Хвостовые слэши убираем,
// чтобы не задвоить их при склейке с ключом файла ниже.
const publicUrl = requireEnv('S3_PUBLIC_URL').replace(/\/+$/, '')

// Собирает ключ объекта в S3/MinIO из имени файла и опционального префикса (папки).
const getObjectKey = (filename: string, prefix?: string | null): string => {
  return [prefix, filename].filter((value): value is string => Boolean(value)).join('/')
}

export const s3StorageOptions: S3StorageOptions = {
  enabled: true,

  bucket: requireEnv('S3_BUCKET'),

  collections: {
    media: {
      // Отдаём файлы напрямую по generateFileURL, минуя Payload —
      // сам Payload не должен проксировать бинарные файлы через себя.
      disablePayloadAccessControl: true,

      generateFileURL: ({ filename, prefix }) => {
        const key = getObjectKey(filename, prefix)

        // Каждый сегмент пути кодируем отдельно (encodeURIComponent),
        // чтобы не сломать сами "/" в структуре ключа.
        return `${publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
      },
    },
  },

  config: {
    endpoint: requireEnv('S3_ENDPOINT'),

    // Регион необязателен — для MinIO и совместимых хранилищ обычно неважен,
    // поэтому есть разумное значение по умолчанию.
    region: process.env.S3_REGION?.trim() || 'us-east-1',

    // path-style (endpoint/bucket/key) вместо virtual-hosted-style
    // (bucket.endpoint/key) — нужно для локального MinIO и большинства
    // S3-совместимых хранилищ, у которых нет DNS-поддомена на бакет.
    forcePathStyle: true,

    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
    },
  },
}
