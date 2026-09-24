import type { CollectionConfig } from 'payload'
import { protectRoles } from './hooks/protectRoles'
import { editor } from '@/access/editor'
import user from '@/access/user'
import { admin } from '@/access/admin'
import { publicOrEditor } from '@/access/publicOrEditor'

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
  auth: true,
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
