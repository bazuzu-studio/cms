import { admin } from '@/access/admin'
import { anyone } from '@/access/anyone'
import { editor } from '@/access/editor'
import type { CollectionConfig } from 'payload'

export const Genres: CollectionConfig = {
  slug: 'genres',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug'],
  },
  access: {
    read: anyone,
    create: editor,
    update: editor,
    delete: admin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-идентификатор для фильтрации, например action, drama',
      },
    },
  ],
}
