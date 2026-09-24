import type { Access } from 'payload'
import { checkRole } from './checkRole'

const user: Access = ({ req: { user } }) => {
  // Неавторизованным доступа нет вообще
  if (!user) return false

  // Admin и editor видят/редактируют всех пользователей без ограничений
  if (checkRole(['admin', 'editor'], user)) return true

  // Обычный user получает Query-констрейнт вместо true/false —
  // Payload сам подставит "WHERE id = user.id" ко всем запросам
  return { id: { equals: user.id } }
}

export default user
