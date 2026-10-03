import type { Endpoint } from 'payload'

/**
 * GET /api/health — лёгкий healthcheck для Docker/Traefik.
 * Делает один дешёвый запрос к БД (без авторизации и без выборки данных),
 * в отличие от /api/users/me, который разбирает токен и грузит пользователя.
 */
export const healthEndpoint: Endpoint = {
  path: '/health',
  method: 'get',
  handler: async (req) => {
    try {
      await req.payload.count({ collection: 'genres', overrideAccess: true })
      return Response.json({ ok: true }, { status: 200 })
    } catch (error) {
      req.payload.logger.error({ err: error }, 'GET /api/health: БД недоступна')
      return Response.json({ ok: false }, { status: 503 })
    }
  },
}
