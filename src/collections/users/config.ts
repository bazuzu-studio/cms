import type { CollectionConfig } from 'payload'
import { protectRoles } from './hooks/protectRoles'
import { editor } from '@/access/editor'
import user from '@/access/user'
import { admin } from '@/access/admin'
import { publicOrEditor } from '@/access/publicOrEditor'
import { cookieDomain, cookieSecure, frontendURLs } from '@/lib/urls'

/**
 * Куда вести пользователя из письма восстановления пароля.
 *
 * Без этого Payload по умолчанию генерирует ссылку на
 * `${serverURL}/admin/reset/<token>` — т.е. на саму CMS (cms.otakuum.ru).
 * Это никак не подходит для обычных пользователей сайта (они не должны
 * ходить в /admin) и просто светит домен CMS без необходимости. Ведём на
 * страницу фронтенда `/reset-password` (apps/web/src/components/pages/
 * ResetPasswordClient.tsx), которая берёт token из query и дергает
 * ту же мутацию resetPasswordUser по GraphQL — так что работает
 * одинаково и для обычных пользователей, и для admin/editor (им после
 * смены пароля просто нужно отдельно зайти в /admin).
 *
 * Если FRONTEND_URL не задан (например, локальный запуск одной CMS без
 * фронтенда) — откатываемся на прежнее поведение Payload по умолчанию.
 */
const resetPasswordFrontendUrl = frontendURLs[0]

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'roles'], // что видно в списке в админ-панели
  },
  access: {
    // create не ограничиваем через access — регистрация должна быть
    // открыта всем гостям. Всю защиту делает protectRoles на уровне поля.
    create: publicOrEditor, // это ограничивает создание ЧЕРЕЗ АДМИНКУ; публичная
    // регистрация обычно идёт через отдельный auth-эндпоинт Payload,
    // который create-access не проверяет — см. документацию Authentication.
    read: user,
    update: user,
    delete: admin,

    // access.admin решает, кто вообще видит саму Admin-панель.
    // Без этого свойства зайти в /admin сможет ЛЮБОЙ аутентифицированный
    // пользователь, включая роль 'user' — это частая ошибка в туториалах.
    admin: ({ req: { user } }) =>
      Boolean(user?.roles?.some((r) => ['admin', 'editor'].includes(r))),
  },
  auth: {
    // Сессия на 7 дней (по умолчанию Payload — 2 часа, пользователей
    // постоянно разлогинивало).
    tokenExpiration: 60 * 60 * 24 * 7,
    // Защита от перебора пароля: 5 неудачных попыток → блокировка на 10 минут.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,

    // [Dokploy] За Traefik/HTTPS (Dokploy) auth-cookie должна быть Secure.
    // SameSite=Lax достаточно для запросов между поддоменами одного сайта
    // (otakuum.ru ↔ cms.otakuum.ru).
    cookies: {
      secure: cookieSecure,
      sameSite: 'Lax',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    },

    // См. комментарий у resetPasswordFrontendUrl выше: уводим пользователя
    // на фронтенд, а не в /admin CMS.
    ...(resetPasswordFrontendUrl
      ? {
          forgotPassword: {
            generateEmailSubject: () => 'Восстановление пароля — MovHub',
            generateEmailHTML: ({ token } = {}) => {
              const resetUrl = `${resetPasswordFrontendUrl}/reset-password?token=${token ?? ''}`
              return `
                <p>Вы запросили восстановление пароля на MovHub.</p>
                <p><a href="${resetUrl}">Придумать новый пароль</a></p>
                <p>Если ссылка не открывается, скопируйте её в браузер: ${resetUrl}</p>
                <p>Если это были не вы — просто проигнорируйте это письмо, пароль останется прежним.</p>
              `
            },
          },
        }
      : {}),
  },
  fields: [
    { name: 'name', type: 'text' },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      saveToJWT: true,
      defaultValue: ['user'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'User', value: 'user' },
      ],
      hooks: {
        beforeChange: [protectRoles], // вся защита живёт здесь
      },
      access: {
        // Дополнительно на уровне ПОЛЯ: редактировать список ролей
        // руками в форме может только admin. Это вторая линия защиты
        // поверх хука — на случай, если хук в будущем поменяют/уберут.
        update: ({ req: { user } }) => Boolean(user?.roles?.includes('admin')),
      },
    },
  ],
}
