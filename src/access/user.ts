import type { Access } from 'payload'
import { checkRole } from './checkRole'

/**
 * Доступ к коллекции users.
 *
 * Полный доступ ко всем пользователям — только у admin. Раньше им же
 * пользовался editor, а значит мог сменить email/пароль любого admin и
 * войти под ним. Теперь editor, как и обычный user, видит и редактирует
 * только собственную запись.
 */
const user: Access = ({ req: { user } }) => {
  // Неавторизованным доступа нет вообще
  if (!user) return false

  if (checkRole(['admin'], user)) return true

  // Query-констрейнт вместо true/false — Payload сам подставит
  // "WHERE id = user.id" ко всем запросам
  return { id: { equals: user.id } }
}

export default user
