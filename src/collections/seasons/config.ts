import { admin } from '@/access/admin'
import { editor } from '@/access/editor'
import type { CollectionConfig } from 'payload'

export const Seasons: CollectionConfig = {
  slug: 'seasons',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['content', 'seasonNumber', 'releaseYear'],
  },
  access: {
    read: () => true,
    create: editor,
    update: editor,
    delete: admin,
  },
  fields: [
    {
      name: 'content',
      type: 'relationship',
      relationTo: 'content',
      required: true,
      filterOptions: {
        type: { equals: 'series' },
      },
      admin: {
        description: 'Родительский сериал (запись Content с type = series)',
      },
    },
    {
      name: 'seasonNumber',
      type: 'number',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      admin: {
        description: 'Название сезона, необязательное',
      },
    },
    {
      name: 'releaseYear',
      type: 'number',
    },
    {
      name: 'episodes',
      type: 'join',
      collection: 'episodes',
      on: 'season',
    },
  ],
}
