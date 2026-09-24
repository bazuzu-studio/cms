
import type { FieldHook } from 'payload'
import type { User } from '@/payload-types'

/**
 * Защищает поле `roles` коллекции Users.
 *
 * Правила:
 * - Неавторизованный create:
 *   - первый пользователь -> admin + user
 *   - остальные -> user
 * - Admin:
 *   - может назначать любые роли
 *   - роль `user` добавляется автоматически
 * - Editor/User:
 *   - не могут менять роли
 *   - при update сохраняются существующие роли
 */
export const protectRoles: FieldHook<User> = async ({
  req,
  data,
  operation,
  originalDoc,
}) => {
  // ============================================================
  // CREATE без авторизации
  // ============================================================
  if (operation === 'create' && !req.user) {
    const { totalDocs } = await req.payload.count({
      collection: 'users',
    })

    // Первый пользователь становится admin + user
    if (totalDocs === 0) {
      return ['admin', 'user']
    }

    // Любая последующая публичная регистрация —
    // только обычный пользователь.
    return ['user']
  }

  // ============================================================
  // Нет авторизации
  // ============================================================
  if (!req.user) {
    return originalDoc
  }

  // ============================================================
  // ADMIN
  // ============================================================
  const isAdmin = req.user.roles?.includes('admin')

  if (isAdmin) {
    // На create/update admin может назначать:
    // ['admin'], ['editor'], ['user'], ['admin', 'editor'] и т.д.
    const roles = new Set(data?.roles ?? [])

    // Базовая роль user всегда присутствует.
    roles.add('user')

    return [...roles]
  }

  // ============================================================
  // НЕ ADMIN
  // ============================================================
  //
  // Editor и обычный user не могут менять роли.
  // Поэтому при update возвращаем существующее значение.
  //
  // Это важно: нельзя возвращать ['user'], иначе при обычном
  // редактировании пользователя можно случайно сбросить
  // его текущую роль.
  if (operation === 'update') {
    return originalDoc
  }

  // На create авторизованным не-admin пользователям
  // назначаем только user.
  return ['user']
}

