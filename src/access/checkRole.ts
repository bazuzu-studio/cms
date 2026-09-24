import type { User } from '@/payload-types'

/**
 * Проверяет, есть ли у пользователя хотя бы одна из разрешённых ролей.
 *
 * @param allowed — список ролей, которым разрешён доступ, например ['admin', 'editor']
 * @param user — текущий пользователь из req.user
 * @returns true, если у пользователя есть хотя бы одна разрешённая роль
 */
export const checkRole = (allowed: NonNullable<User['roles']>, user?: User | null): boolean => {
  if (!user) return false

  return allowed.some((role) => user.roles?.includes(role))
}
