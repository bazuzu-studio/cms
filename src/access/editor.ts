import type { Access } from 'payload'
import { checkRole } from './checkRole'

export const editor: Access = ({ req: { user } }) =>
  Boolean(user) && checkRole(['admin', 'editor'], user!)
