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

/**
 * Без COOKIE_DOMAIN на разных хостах CMS/frontend auth-cookie host-only:
 * GraphQL на cms.otakuum.ru её видит (пользователь реально залогинен), а вот
 * middleware.ts фронтенда (apps/web) — уже нет, потому что запрос идёт на
 * otakuum.ru, где этой cookie никогда не было. Итог — защищённые страницы
 * (/profile, /favorites) бесконечно кидают на /login, хотя логин прошёл
 * успешно. Ошибка тихая (просто отсутствующая cookie, никаких исключений),
 * поэтому предупреждаем в логах при старте, а не оставляем искать её заново.
 */
if (!cookieDomain && frontendURLs.length > 0) {
  try {
    const cmsHost = new URL(cmsURL).hostname
    const crossOriginFrontends = frontendURLs.filter((url) => new URL(url).hostname !== cmsHost)
    if (crossOriginFrontends.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `[urls] COOKIE_DOMAIN не задан, а CMS_URL (${cmsHost}) и FRONTEND_URL ` +
          `(${crossOriginFrontends.join(', ')}) — разные хосты. Auth-cookie будет ` +
          'host-only на CMS_URL и не будет видна серверу фронтенда (в частности, ' +
          'его middleware.ts для /profile, /favorites) — пользователи будут выглядеть ' +
          'разлогиненными на защищённых страницах сразу после успешного входа. ' +
          'Если это поддомены одного домена, задайте COOKIE_DOMAIN=.<корневой домен>, ' +
          'например .otakuum.ru.',
      )
    }
  } catch {
    // CMS_URL/FRONTEND_URL не распарсились как URL — эту проблему read-only
    // модуль urls.ts не решает, а падать из-за диагностики не стоит.
  }
}
