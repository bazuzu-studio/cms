import type { Access } from 'payload'
import { checkRole } from './checkRole'

/**
 * Чтение коллекций с включёнными черновиками (versions.drafts).
 *
 * С `read: () => true` черновики (`_status = 'draft'`) были доступны любому
 * через публичный API. Здесь анонимы и обычные пользователи видят только
 * опубликованное, admin/editor — всё.
 *
 * Аварийный выключатель: CONTENT_PUBLIC_DRAFTS=true возвращает прежнее
 * поведение (например, пока пайплайн ещё не пишет `_status = 'published'`
 * в новые записи — см. DOKPLOY_UPDATE.md).
 */
const allowPublicDrafts = process.env.CONTENT_PUBLIC_DRAFTS === 'true'

export const publishedOrEditor: Access = ({ req: { user } }) => {
  if (allowPublicDrafts) return true
  if (user && checkRole(['admin', 'editor'], user)) return true

  return { _status: { equals: 'published' } }
}
