/**
 * [Dokploy] URL'ы CMS и frontend + список разрешённых origin'ов для CORS/CSRF.
 *
 * Все значения читаются из runtime-переменных окружения (Dokploy → Environment):
 *
 *   CMS_URL       — публичный URL этой CMS, например https://cms.otakuum.ru
 *   FRONTEND_URL  — URL frontend-приложения (apps/web). Можно несколько
 *                   через запятую: https://otakuum.ru,https://www.otakuum.ru
 *
 * Для обратной совместимости CMS_URL по-прежнему можно задать через
 * NEXT_PUBLIC_APP_URL, но CMS_URL предпочтительнее: NEXT_PUBLIC_* переменные
 * Next.js может «вшить» в бандл на этапе сборки образа, когда реальных
 * значений ещё нет.
 */

const isProduction = process.env.NODE_ENV === 'production'

/** Убирает пробелы и хвостовые слэши: CSRF/CORS сравнивают origin строго. */
const normalizeOrigin = (value: string): string => value.trim().replace(/\/+$/, '')

const splitList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)

/**
 * URL текущего Payload CMS (Admin Panel и API живут на этом origin).
 * В dev по умолчанию http://localhost:4000 (см. скрипт `dev`).
 */
export const cmsURL = normalizeOrigin(
  process.env.CMS_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000',
)

/**
 * URL'ы frontend-приложения. В dev по умолчанию http://localhost:3000,
 * в production localhost по умолчанию НЕ добавляем — только то,
 * что явно указано в FRONTEND_URL.
 */
export const frontendURLs = splitList(
  process.env.FRONTEND_URL || (isProduction ? '' : 'http://localhost:3000'),
)

/** Origin'ы, которым Payload разрешает обращаться к API (cors + csrf). */
export const allowedOrigins = Array.from(new Set([cmsURL, ...frontendURLs]))

/** Auth-cookie должна быть Secure, когда CMS отдаётся по HTTPS. */
export const cookieSecure = cmsURL.startsWith('https://')

/**
 * Необязательный домен для auth-cookie. Нужен, только если frontend на другом
 * поддомене должен видеть cookie CMS (например, COOKIE_DOMAIN=.otakuum.ru).
 * Если не задан — cookie host-only (cms.otakuum.ru), что безопаснее.
 */
export const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined
