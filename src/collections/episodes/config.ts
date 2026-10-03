import { admin } from '@/access/admin'
import { editor } from '@/access/editor'
import type { CollectionConfig } from 'payload'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'

export const Episodes: CollectionConfig = {
  slug: 'episodes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['season', 'episodeNumber', 'title', 'airingAt'],
  },
  access: {
    read: () => true,
    create: editor,
    update: editor,
    delete: admin,
  },
  hooks: {
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
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
        description: 'Время выхода эпизода (Unix-время, секунды). Фронтенд показывает его как дату выхода серии',
      },
    },

  ],
}
