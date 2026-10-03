import { checkRole } from '@/access/checkRole'
import { ValidationError } from 'payload'
import type { CollectionConfig, FieldHook } from 'payload'
import type { User } from '@/payload-types'

/**
 * beforeChange-хук на поле `user`: принудительно подставляет id текущего
 * пользователя, если он не admin. Это единственный надёжный способ
 * запретить создание избранного "от чужого имени" — access.create
 * работает на уровне всего запроса и не видит конкретные значения полей.
 */
const forceOwnerOnCreate: FieldHook<User> = ({ req, value, operation }) => {
  // На update это поле трогать нельзя вообще (см. access.update ниже),
  // но на всякий случай ограничиваем логику только create.
  if (operation !== 'create') return value

  if (!req.user) return value // сюда не дойдёт — access.create уже отсечёт

  if (checkRole(['admin'], req.user)) {
    // Админ может (например, через Local API/скрипт) создать запись
    // для другого пользователя, если это реально нужно — передаёт value как есть.
    return value ?? req.user.id
  }

  // Обычный пользователь — всегда владелец записи, что бы ни пришло в запросе.
  return req.user.id
}

/**
 * beforeValidate на уровне коллекции:
 *  1. Для обычного пользователя владелец ВСЕГДА он сам — подставляем до
 *     проверки дубликата, иначе проверка шла бы по чужому id из запроса.
 *  2. Проверка дубликата: один и тот же content не может быть добавлен
 *     дважды одним пользователем. Ошибка — ValidationError (HTTP 400 с
 *     понятным сообщением), а не голый Error (500).
 *
 * Окончательную защиту от гонки двух одновременных запросов даёт
 * уникальный индекс favorites_user_content_unique (см. миграцию
 * hardening_and_franchise) — Payload-схемой он не описывается.
 */
const preventDuplicateFavorite: CollectionConfig['hooks'] = {
  beforeValidate: [
    async ({ req, data, operation }) => {
      if (operation !== 'create' || !data) return data

      const next =
        req.user && !checkRole(['admin'], req.user) ? { ...data, user: req.user.id } : data

      if (!next.user || !next.content) return next

      const existing = await req.payload.find({
        collection: 'favorites',
        where: {
          and: [
            { user: { equals: next.user } },
            { content: { equals: next.content } },
          ],
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })

      if (existing.totalDocs > 0) {
        throw new ValidationError({
          errors: [{ message: 'Этот контент уже добавлен в избранное', path: 'content' }],
        })
      }

      return next
    },
  ],
}

/**
 * Избранное вынесено в отдельную коллекцию (не поле-массив в Users):
 * хранится на backend, доступно с любого устройства после входа,
 * доступ к записям ограничен владельцем (или админом).
 */
export const Favorites: CollectionConfig = {
  slug: 'favorites',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['user', 'content', 'createdAt'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (checkRole(['admin'], user)) return true
      return { user: { equals: user.id } }
    },
    // Создавать может любой залогиненный — КОМУ именно принадлежит запись,
    // решает forceOwnerOnCreate на уровне поля, а не эта проверка.
    create: ({ req: { user } }) => Boolean(user),
    update: () => false,
    delete: ({ req: { user } }) => {
      if (!user) return false
      if (checkRole(['admin'], user)) return true
      return { user: { equals: user.id } }
    },
  },
  hooks: preventDuplicateFavorite,
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: {
        description: 'Владелец записи',
        // Скрываем поле из формы создания в админке для обычных юзеров —
        // им всё равно подставится их id автоматически.
        readOnly: true,
      },
      hooks: {
        beforeChange: [forceOwnerOnCreate],
      },
      access: {
        // Дополнительная защита: менять владельца в UI может только admin,
        // хотя update и так запрещён на уровне коллекции (update: () => false).
        update: ({ req: { user } }) => Boolean(user && checkRole(['admin'], user)),
      },
    },
    {
      name: 'content',
      type: 'relationship',
      relationTo: 'content',
      required: true,
      admin: {
        description: 'Фильм или сериал; тип определяется через content.type',
      },
    },
  ],
  // createdAt/updatedAt проставляются автоматически Payload (timestamps: true по умолчанию)
}