import type { CollectionConfig } from 'payload'

import { editor } from '@/access/editor'
import { admin } from '@/access/admin'
import { publishedOrEditor } from '@/access/publishedOrEditor'
import { revalidateAfterChange, revalidateAfterDelete } from '@/hooks/revalidate'
import { slugify } from '@/lib/slugify'

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
    useAsTitle: 'titleRu',

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
    // Анонимы видят только опубликованное (_status = 'published'),
    // admin/editor — всё, включая черновики. См. access/publishedOrEditor.ts.
    read: publishedOrEditor,
    create: editor,
    update: editor,
    delete: admin,
  },

  versions: {
    drafts: true,
    // Без лимита таблица _content_v разрастается при каждом обновлении
    // записи пайплайном/админкой.
    maxPerDoc: 10,
  },

  hooks: {
    // Сбрасываем кэш фронтенда сразу после правки (см. lib/revalidate.ts).
    afterChange: [revalidateAfterChange],
    afterDelete: [revalidateAfterDelete],
  },

  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
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
      // Не unique: ремейки и одноимённые тайтлы («The Thing» 1982 и 2011)
      // иначе ломали импорт. Уникальность обеспечивает slug.
      index: true,
      admin: {
        description:
          'Название на английском языке — источник slug (может повторяться у разных тайтлов)',
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
          'Генерируется автоматически из названия (с транслитерацией), если оставить пустым',
      },
      hooks: {
        beforeValidate: [
          async ({ value, data, req, originalDoc }) => {
            if (value) return value

            const base =
              slugify(data?.titleEn) ||
              slugify(data?.titleRu) ||
              slugify(data?.originalTitle)

            if (!base) return value

            // slug уникален: при коллизии добавляем год, затем kodikId.
            const candidates = [
              base,
              data?.releaseYear ? `${base}-${data.releaseYear}` : '',
              data?.kodikId ? `${base}-${slugify(String(data.kodikId))}` : '',
            ].filter(Boolean)

            for (const candidate of candidates) {
              const existing = await req.payload.find({
                collection: 'content',
                where: {
                  and: [
                    { slug: { equals: candidate } },
                    ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
                  ],
                },
                limit: 1,
                depth: 0,
                draft: true,
                overrideAccess: true,
              })

              if (existing.totalDocs === 0) return candidate
            }

            return candidates[candidates.length - 1]
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
      name: 'franchiseId',
      type: 'text',
      index: true,
      admin: {
        position: 'sidebar',
        description:
          'Идентификатор франшизы: записи (сезоны) с одинаковым значением показываются на сайте как сезоны одного сериала. Если пусто — используется kinopoiskId',
      },
    },

    {
      name: 'releaseYear',
      type: 'number',
      required: true,
      index: true,
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
      index: true,
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
      // По умолчанию join отдаёт только 10 документов — у длинных
      // франшиз сезоны обрезались.
      defaultLimit: 100,
      defaultSort: 'seasonNumber',
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
          'Устаревшее служебное поле. Видимость на сайте определяет _status (кнопки «Опубликовать» / «Черновик» в админке), а не это поле. Не путать со статусом релиза (releaseStatus)',
      },
    },
  ],
}
