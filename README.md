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
- PostgreSQL (локально — через `docker-compose.dev.yml`)
- S3-совместимое хранилище (MinIO — поднимается тем же `docker-compose.dev.yml`) для загрузки медиафайлов

## Переменные окружения

Скопируйте `.env.example` в `.env` и заполните:

```bash
cp .env.example .env
```

| Переменная | Обязательна | Описание |
| --- | --- | --- |
| `DATABASE_URL` | да | Строка подключения к PostgreSQL, например `postgresql://postgres:postgres@127.0.0.1:5432/movhub` |
| `PAYLOAD_SECRET` | да | Секрет для подписи JWT и шифрования Payload (`openssl rand -hex 32`) |
| `CMS_URL` | нет | Публичный URL самой CMS (`serverURL`, CORS/CSRF, флаг `Secure` у auth-cookie). По умолчанию `http://localhost:4000`. Старое имя `NEXT_PUBLIC_APP_URL` тоже читается, но `CMS_URL` предпочтительнее |
| `FRONTEND_URL` | нет | URL приложения `apps/web`, можно несколько через запятую. В dev по умолчанию `http://localhost:3000`, в production — пусто |
| `COOKIE_DOMAIN` | нет | Домен auth-cookie (например `.otakuum.ru`), если frontend на другом поддомене должен видеть cookie CMS. По умолчанию host-only |
| `PORT` | нет | Порт dev-сервера (по умолчанию задаётся флагом `-p 4000` в скрипте `dev`); в Docker-образе — `3000` |
| `S3_BUCKET` | да | Имя S3-бакета для медиафайлов |
| `S3_ENDPOINT` | да | Endpoint S3/MinIO, к которому обращается **сервер** CMS, например `http://localhost:9000` (в Dokploy — `http://movhub-minio:9000`) |
| `S3_REGION` | нет | Регион (по умолчанию `us-east-1`) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | да | Ключи доступа к S3/MinIO |
| `S3_PUBLIC_URL` | да | Публичный URL, по которому **браузер** получает файлы (`http://localhost:9000/media` локально, `https://cms.otakuum.ru/media` в production) |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | для MinIO | Учётные данные самого MinIO (docker-compose) |
| `MINIO_API_PORT` / `MINIO_CONSOLE_PORT` | нет | Порты MinIO в `docker-compose.dev.yml` (по умолчанию `9000` / `9001`) |
| `KODIK_API_TOKEN` | только для импорта | Токен Kodik API — нужен эндпоинту `/api/import/kodik` |

Шаблон — в `.env.example`. Для Dokploy значения задаются во вкладке **Environment** (см. раздел «Деплой в Dokploy»).

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

Перед запуском убедитесь, что подняты PostgreSQL и MinIO:

```bash
docker compose -f docker-compose.dev.yml up -d
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
| `pnpm migrate:create <имя>` | Создать миграцию БД после изменения коллекций (см. «Миграции БД») |
| `pnpm migrate` / `pnpm migrate:status` | Применить миграции / показать статус |
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

Коллекция `media` настроена на S3-совместимое хранилище (`src/lib/storage/s3.ts`). URL для отдачи файлов браузеру собирается из `S3_PUBLIC_URL`, доступ к бакету настраивается автоматически сервисом `minio-init` из `docker-compose.dev.yml` (локально) / `movhub-minio-init` из `docker-compose.yml` (Dokploy).

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
│   ├── migrations/            # Миграции БД (`pnpm migrate:create`), применяются при старте в production
│   ├── payload-types.ts       # Автогенерируемые типы (`pnpm generate:types`, не редактировать вручную)
│   └── payload.config.ts       # Главный конфиг Payload (коллекции, БД, S3, CORS, endpoints)
├── tests/
│   ├── int/                  # Интеграционные тесты (Vitest)
│   ├── e2e/                   # E2E-тесты (Playwright)
│   └── helpers/                 # Общие хелперы для тестов
├── Dockerfile
├── docker-compose.yml       # Деплой в Dokploy: CMS + MinIO
├── docker-compose.dev.yml   # Локальная инфраструктура: PostgreSQL + MinIO
└── playwright.config.ts / vitest.config.mts
```

## Миграции БД

В dev-режиме (`pnpm dev`) схему синхронизирует Drizzle push. В production push отключён, поэтому схема разворачивается **миграциями** из `src/migrations`, а `prodMigrations` в `src/payload.config.ts` применяет их автоматически при старте контейнера.

После любого изменения коллекций/полей:

```bash
pnpm migrate:create <короткое-имя>   # создаст файл в src/migrations и обновит index.ts
pnpm generate:types                  # обновит src/payload-types.ts
git add src/migrations src/payload-types.ts
```

Закоммитьте миграцию вместе с изменением — при следующем деплое она применится сама.

## Docker

- `Dockerfile` — production-образ (Next.js `output: 'standalone'`, Node 22 Alpine, запуск не от root). Для сборки runtime-переменные не нужны.
- `docker-compose.yml` — деплой в Dokploy: CMS + MinIO (+ одноразовая инициализация бакета). См. ниже.
- `docker-compose.dev.yml` — только инфраструктура для локальной разработки (PostgreSQL + MinIO).

## Деплой в Dokploy

Домен: **cms.otakuum.ru**. БД — уже созданная в Dokploy PostgreSQL, обращение по внутреннему хосту.

1. **DNS.** A-запись `cms.otakuum.ru` → IP сервера Dokploy.
2. **Создать приложение:** Project → *Create Service* → **Compose**. Provider: Git (репозиторий с этим кодом), *Compose Path* — `./docker-compose.yml`, *Compose Type* — Docker Compose.
3. **Environment.** Вставить содержимое `dokploy.env` (шаблон — `.env.example`, блок PRODUCTION).
4. **Домены в UI Dokploy не добавлять** — Traefik-роутеры для `cms.otakuum.ru` и `cms.otakuum.ru/media/` уже описаны лейблами в `docker-compose.yml`. Сертификат Let's Encrypt выпускается автоматически.
5. **Deploy.** При первом старте CMS сама применит миграции к БД `movhub`. Затем откройте `https://cms.otakuum.ru/admin` и создайте первого администратора.

Как это устроено:

| Что | Где |
| --- | --- |
| Админка и API | `https://cms.otakuum.ru` → сервис `cms` (порт 3000) |
| Файлы (медиа) | `https://cms.otakuum.ru/media/<файл>` → сервис `movhub-minio` (порт 9000), анонимное только чтение |
| Загрузка файлов | сервер CMS → `http://movhub-minio:9000` по внутренней сети (снаружи запись недоступна без ключей) |
| БД | `my-first-project-database-jxz2iy:5432` через внешнюю сеть `dokploy-network` |
| Консоль MinIO | наружу не опубликована; при необходимости — через SSH-туннель к порту 9001 контейнера |

> Если меняете имя бакета (`S3_BUCKET`), поменяйте `/media/` в лейблах `docker-compose.yml` и в `S3_PUBLIC_URL`.
