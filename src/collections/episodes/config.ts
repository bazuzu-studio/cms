import { admin } from '@/access/admin'
import { editor } from '@/access/editor'
import type { CollectionConfig } from 'payload'

export const Episodes: CollectionConfig = {
  slug: 'episodes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['season', 'episodeNumber', 'title', 'releaseDate'],
  },
  access: {
    read: () => true,
    create: editor,
    update: editor,
    delete: admin,
  },
  fields: [
    {
      name: 'season',
      type: 'relationship',
      relationTo: 'seasons',
      required: true,
      admin: {
        description: 'Родительский сезон',
      },
    },
    {
      name: 'episodeNumber',
      type: 'number',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      defaultValue: "Эпизод"
    },
    {
      name:"playerLink",
      type: 'text',
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'duration',
      type: 'number',
      admin: {
        description: 'Длительность в минутах',
      },
    },
    {
      name: 'airingAt',
      type: 'number',
      label: 'Время эфира (Unix)',
      admin: {
        description: 'Точное время выхода эпизода (если отличается от releaseDate)',
      },
    },

  ],
}
