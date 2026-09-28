import type { CollectionConfig } from 'payload'

import { editor } from '@/access/editor'
import { admin } from '@/access/admin'
import { anyone } from '@/access/anyone'

/**
 * Единая коллекция для фильмов и сериалов.
 *
 * Данные импортируются из Kodik API.
 *
 * В PostgreSQL:
 *   createdAt -> created_at
 *   updatedAt -> updated_at
 *   ageRating -> age_rating
 *   releaseStatus -> release_status
 *
 * Поле `type` различает movie / series.
 */
export const Content: CollectionConfig = {
  slug: 'content',

  timestamps: true,

  admin: {
    useAsTitle: 'titleEn',

    defaultColumns: [
      'titleRu',
      'titleEn',
      'type',
      'releaseYear',
      'updatedAt',
      'createdAt',
    ],
  },

  access: {
    read: anyone,
    create: editor,
    update: editor,
    delete: admin,
  },

  versions: {
    drafts: true,
  },

  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Фильм', value: 'movie' },
        { label: 'Сериал', value: 'series' },
      ],
      admin: {
        description: 'Определяет, какие поля/связи актуальны для записи',
      },
    },

    {
      name: 'titleEn',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description:
          'Название на английском языке — основной идентификатор, источник slug',
      },
    },

    {
      name: 'titleRu',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description:
          'Название на русском языке — отображается в интерфейсе по умолчанию',
      },
    },

    {
      name: 'originalTitle',
      type: 'text',
      admin: {
        description: 'Оригинальное название, если отличается от titleEn',
      },
    },

    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        description:
          'Генерируется автоматически из titleEn, если оставить пустым',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (value) return value

            return data?.titleEn
              ?.toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '')
          },
        ],
      },
    },

    {
      name: 'description',
      type: 'richText',
    },

    {
      name: 'kinopoiskId',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Для дедупликации при импорте из Kodik',
      },
    },

    {
      name: 'shikimoriId',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Для дедупликации при импорте из Kodik',
      },
    },

    {
      name: 'kodikId',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'ID материала в Kodik',
      },
    },

    {
      name: 'releaseYear',
      type: 'number',
      required: true,
      admin: {
        description:
          'Год выпуска (movie) или год начала выхода (series)',
      },
    },

    {
      name: 'duration',
      type: 'number',
      admin: {
        description: 'Длительность в минутах (только для фильмов)',
        condition: (data) => data?.type === 'movie',
      },
    },

    {
      name: 'genres',
      type: 'relationship',
      relationTo: 'genres',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },

    {
      name: 'rating',
      type: 'number',
      min: 0,
      max: 10,
    },

    // --- НОВОЕ ПОЛЕ: playerLink ---
    {
      name: 'playerLink',
      type: 'text',
      label: 'Ссылка на плеер',
      admin: {
        description: 'Прямая ссылка для встроенного плеера (только для фильмов)',
        condition: (data) => data?.type === 'movie', // Показывать только если тип — фильм
      },
    },
    // -----------------------------

    {
      name: 'ageRating',
      type: 'number',
      min: 0,
      admin: {
        position: 'sidebar',
        description:
          'Возрастное ограничение (0, 6, 12, 16, 18). Источник: Kodik material_data.minimal_age',
      },
    },

    /**
     * Статус выхода: анонс / выходит / вышло.
     *
     * Источник — Kodik material_data.anime_status (аниме) или all_status
     * (остальные сериалы). Значения совпадают со значениями Kodik, поэтому
     * пайплайн (kodik-pipeline) пишет их в колонку release_status без
     * преобразований. Команда `pipeline.py update-ongoing` использует поле,
     * чтобы находить сериалы, у которых выходят новые серии.
     *
     * Не путать с `status` ниже — тот служебный (draft/published).
     */
    {
      name: 'releaseStatus',
      type: 'select',
      label: 'Статус релиза',
      index: true,
      options: [
        { label: 'Анонс', value: 'anons' },
        { label: 'Выходит', value: 'ongoing' },
        { label: 'Вышло', value: 'released' },
      ],
      admin: {
        position: 'sidebar',
        description:
          'Анонс / выходит / вышло. Обновляется пайплайном из Kodik; при ручной правке будет перезаписано при следующем импорте',
      },
    },

    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Постер (вертикальный)',
      },
    },

    {
      name: 'backdrop',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Фоновое изображение',
      },
    },

    {
      name: 'seasons',
      type: 'join',
      collection: 'seasons',
      on: 'content',
      admin: {
        description:
          'Связанные сезоны (обратная связь, только для сериалов)',
        condition: (data) => data?.type === 'series',
      },
    },

    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Черновик', value: 'draft' },
        { label: 'Опубликовано', value: 'published' },
      ],
      admin: {
        description:
          'Служебный статус публикации записи в Payload — не путать со статусом релиза (releaseStatus: анонс/выходит/вышло)',
      },
    },
  ],
}
