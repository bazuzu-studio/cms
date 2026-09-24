// access/publicOrEditor.ts
import type { Access } from 'payload'
import { checkRole } from './checkRole'

/**
 * Разрешает создание документа:
 * - анонимному пользователю (req.user отсутствует) — публичная регистрация;
 * - admin/editor — создание пользователей через админку.
 *
 * Всю защиту от повышения роли при анонимной регистрации делает
 * protectRoles (beforeChange hook на поле roles), а не эта функция —
 * она лишь решает, можно ли ВООБЩЕ создать документ.
 */
export const publicOrEditor: Access = ({ req: { user } }) => {
  if (!user) return true // анонимная регистрация разрешена
  return checkRole(['admin', 'editor'], user)
}