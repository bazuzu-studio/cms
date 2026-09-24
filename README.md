# apps/cms — Backend (Payload CMS)

Backend и админ-панель онлайн-кинотеатра на [Payload CMS 3](https://payloadcms.com/) (поверх Next.js). Хранит каталог фильмов/сериалов, жанры, сезоны/эпизоды, пользователей и избранное; отдаёт REST и GraphQL API для [`apps/web`](../web); умеет импортировать аниме-каталог из [Kodik API](https://kodikapi.com/).

## Стек

- **Payload CMS 3** (`payload`, `@payloadcms/next`, `@payloadcms/ui`)
- **PostgreSQL** — `@payloadcms/db-postgres`
- **S3-совместимое хранилище** (MinIO) для медиафайлов — `@payloadcms/storage-s3`, `@payloadcms/plugin-cloud-storage`
- **Lexical** — richtext-редактор (`@payloadcms/richtext-lexical`)
- **sharp** — обработка изображений
- **Vitest** — интеграционные тесты, **Playwright** — e2e-тесты

## Требования

- Node.js `^18.20.2` или `>=20.9.0`
- pnpm `^9 || ^10 || ^11`
- PostgreSQL (локально или через корневой `docker-compose.yml`)
- S3-совместимое хранилище (MinIO — поднимается тем же `docker-compose.yml`) для загрузки медиафайлов

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

> В репозитории `.env.example` унаследован от стандартного Payload-темплейта и указывает на MongoDB — **фактически проект использует PostgreSQL** (`@payloadcms/db-postgres`, см. `src/payload.config.ts`). Используйте таблицу ниже, а не значения из `.env.example` по умолчанию.

| Переменная | Обязательна | Описание |
| --- | --- | --- |
| `DATABASE_URL` | да | Строка подключения к PostgreSQL, например `postgres://admin:password@127.0.0.1:5432/movies2` |
| `PAYLOAD_SECRET` | да | Секрет для подписи JWT и шифрования Payload |
| `PORT` | нет | Порт dev-сервера (по умолчанию задаётся флагом `-p 4000` в скрипте `dev`) |
| `NEXT_PUBLIC_APP_URL` | нет | URL самой CMS (`serverURL`, используется в `admin` и CORS/CSRF). По умолчанию `http://localhost:4000` |
| `FRONTEND_URL` | нет | URL приложения `apps/web`, добавляется в разрешённые CORS/CSRF-origin'ы. По умолчанию `http://localhost:3000` |
| `S3_BUCKET` | да | Имя S3-бакета для медиафайлов |
| `S3_ENDPOINT` | да | Endpoint S3/MinIO, например `http://localhost:9000` |
| `S3_REGION` | нет | Регион (по умолчанию `us-east-1`) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | да | Ключи доступа к S3/MinIO |
| `S3_PUBLIC_URL` | да | Публичный URL, по которому браузер будет загружать файлы (например `http://localhost:9000/media`) |
| `KODIK_API_TOKEN` | только для импорта | Токен Kodik API — нужен эндпоинту `/api/import/kodik` |

Готовый набор значений для локальной разработки со всеми сервисами уже подготовлен в `.env.local` в **корне** монорепозитория — можно скопировать нужные переменные оттуда.

## Установка и запуск

Из корня монорепо (поднимет и `cms`, и `web` через Turborepo):

```bash
pnpm install
pnpm dev
```

Либо только это приложение:

```bash
cd apps/cms
pnpm install
pnpm dev
```

Перед запуском убедитесь, что подняты PostgreSQL и MinIO (см. корневой [`docker-compose.yml`](../../README.md#инфраструктура-docker-compose)):

```bash
docker-compose up -d
```

CMS и Admin Panel будут доступны на [http://localhost:4000/admin](http://localhost:4000/admin). При первом запуске Payload предложит создать первого администратора.

- GraphQL API: `http://localhost:4000/api/graphql`
- GraphQL Playground: `http://localhost:4000/api/graphql-playground`
- REST API: `http://localhost:4000/api/<slug коллекции>`

## Скрипты

| Команда | Описание |
| --- | --- |
| `pnpm dev` | Запуск dev-сервера на порту `4000` |
| `pnpm devsafe` | То же, но с предварительной очисткой `.next` (при странностях в кеше) |
| `pnpm build` | Продакшн-сборка |
| `pnpm start` | Запуск собранного приложения |
| `pnpm lint` | ESLint |
| `pnpm generate:types` | Сгенерировать `src/payload-types.ts` из текущей конфигурации коллекций |
| `pnpm generate:importmap` | Сгенерировать import map для Admin Panel (нужно после добавления кастомных admin-компонентов) |
| `pnpm payload` | Доступ к Payload CLI |
| `pnpm test` | Все тесты (`test:int` + `test:e2e`) |
| `pnpm test:int` | Интеграционные тесты (Vitest) |
| `pnpm test:e2e` | E2E-тесты (Playwright) |

## Коллекции

| Коллекция | Назначение | Доступ на чтение | Особенности |
| --- | --- | --- | --- |
| `users` | Пользователи, аутентификация (`auth: true`) | владелец/админ | Роли (`roles`, `hasMany`), доступ в Admin Panel только у `admin`/`editor`; публичная регистрация — через auth-эндпоинт Payload |
| `content` | Единая коллекция для фильмов и сериалов | все | Поле `type` (`movie`/`series`) переключает релевантные поля в Admin UI; включены черновики (`versions.drafts`) |
| `genres` | Жанры | все | Уникальные `title`/`slug` |
| `seasons` | Сезоны сериалов | все | `relationship` на `content` (только записи с `type = series`) |
| `episodes` | Эпизоды | все | `relationship` на `seasons` |
| `favorites` | Избранное пользователей | владелец | Хук `beforeChange` принудительно проставляет текущего пользователя владельцем; хук `beforeValidate` не даёт добавить один и тот же контент дважды |
| `media` | Загруженные файлы (постеры, скриншоты и т.п.) | все | Хранится в S3/MinIO через `@payloadcms/storage-s3` (`disablePayloadAccessControl: true`) |

Создание/изменение контента — роли `editor`/`admin` (см. `src/access`), удаление — только `admin`.

## Импорт из Kodik

`POST /api/import/kodik` — импортирует фильмы/сериалы (по умолчанию — аниме: `anime,anime-serial`) из Kodik API в коллекции `content`/`genres`/`seasons`/`episodes`. Доступен ролям `admin` и `editor`, требует настроенного `KODIK_API_TOKEN`.

Тело запроса (`KodikImportRequestBody`):

| Поле | Тип | По умолчанию | Описание |
| --- | --- | --- | --- |
| `mode` | `'list' \| 'search'` | `'list'` | Постраничный обход каталога или точечный поиск по названию/Shikimori ID |
| `types` | `string` | `anime,anime-serial` | Типы контента Kodik (через запятую) |
| `title` | `string` | — | Название для поиска (обязательно для `mode: 'search'`, если нет `shikimoriId`) |
| `shikimoriId` | `string` | — | Поиск по ID Shikimori |
| `year` | `number` | — | Фильтр по году (только для `mode: 'list'`) |
| `maxPages` | `number` | `1` | Сколько страниц `/list` обойти за один вызов (защита от случайного обхода всего каталога) |
| `downloadImages` | `boolean` | `false` | Скачивать `poster_url` и загружать в коллекцию `media` |
| `importEpisodes` | `boolean` | `true` | Разбирать `seasons`/`episodes` и создавать соответствующие записи |
| `dryRun` | `boolean` | `false` | Ничего не писать в БД, только посчитать, что было бы сделано |

Ответ содержит отчёт: количество созданных/обновлённых/пропущенных материалов и список ошибок. Бизнес-логика вынесена в `src/lib/kodik/*` (клиент Kodik API, маппинг материалов в `content`/`genres`/`seasons`/`episodes`, загрузка медиа).

## Хранилище файлов (S3/MinIO)

Коллекция `media` настроена на S3-совместимое хранилище (`src/lib/storage/s3.ts`). URL для отдачи файлов браузеру собирается из `S3_PUBLIC_URL`, доступ к бакету настраивается автоматически сервисом `minio-init` из корневого `docker-compose.yml`.

## Тестирование

```bash
pnpm test        # интеграционные + e2e
pnpm test:int     # только Vitest (tests/int)
pnpm test:e2e     # только Playwright (tests/e2e)
```

Переменные окружения для тестов — в `test.env`. E2E-тесты (`tests/e2e/admin.e2e.spec.ts`, `tests/e2e/frontend.e2e.spec.ts`) используют хелперы из `tests/helpers` (сидирование пользователя, логин).

## Структура проекта

```
apps/cms/
├── src/
│   ├── access/            # Функции доступа (admin, editor, anyone, user, ...)
│   ├── collections/         # Конфигурации коллекций Payload
│   │   ├── content/
│   │   ├── episodes/
│   │   ├── favorites/
│   │   ├── genres/
│   │   ├── media/
│   │   ├── seasons/
│   │   └── users/
│   ├── endpoints/
│   │   └── kodik-import.ts   # POST /api/import/kodik
│   ├── lib/
│   │   ├── kodik/              # Клиент Kodik API, мапперы материалов/жанров/сезонов/медиа
│   │   └── storage/             # Конфигурация S3-хранилища
│   ├── app/
│   │   ├── (payload)/           # Admin Panel и API-роуты Payload
│   │   └── (frontend)/           # Служебный frontend-роут самого Payload-приложения
│   ├── payload-types.ts       # Автогенерируемые типы (`pnpm generate:types`, не редактировать вручную)
│   └── payload.config.ts       # Главный конфиг Payload (коллекции, БД, S3, CORS, endpoints)
├── tests/
│   ├── int/                  # Интеграционные тесты (Vitest)
│   ├── e2e/                   # E2E-тесты (Playwright)
│   └── helpers/                 # Общие хелперы для тестов
├── Dockerfile
├── docker-compose.yml       # Локальный docker-compose для этого приложения (альтернатива корневому)
└── playwright.config.ts / vitest.config.mts
```

## Docker

В `apps/cms` есть собственные `Dockerfile` и `docker-compose.yml` для изолированного локального запуска (например, для сборки production-образа CMS). Для полноценной локальной разработки монорепозитория используйте корневой `docker-compose.yml` — он поднимает PostgreSQL, Redis и MinIO для всей платформы сразу.