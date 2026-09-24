# Обновление под Dokploy — cms-main-dokploy

Дата: 24.09.2026 · Целевой домен: **cms.otakuum.ru** · БД: `movhub` (PostgreSQL в составе compose-стека)

В коде все изменённые места помечены комментарием `[Dokploy]` — найти их можно поиском:

```bash
grep -rn "\[Dokploy\]" src next.config.ts pnpm-workspace.yaml Dockerfile docker-compose*.yml
```

## Ревизия 3 — в Dokploy запускается только CMS

PostgreSQL и MinIO — отдельные сервисы проекта Dokploy, поэтому `docker-compose.yml` теперь содержит **только `cms`** (и лейблы Traefik). Подключение к БД и S3 — только через переменные окружения: `DATABASE_URL` (Internal Host БД) и `S3_ENDPOINT` / `S3_PUBLIC_URL` / ключи (внутренний и публичный адреса вашего MinIO). Промежуточная версия с PostgreSQL внутри стека отменена.

Рекомендуемый тип сервиса — **Application** (Build Type: Dockerfile), домен добавляется в UI; сервис **Compose** тоже работает. Ошибка `ENOTFOUND my-first-project-database-*` означает, что внутренний хост БД не найден: проверьте, что БД в статусе Running, что Internal Host скопирован из карточки БД точно, и что CMS и БД на одном сервере.

## 1. Что изменено и зачем

### Зависимости — `package.json`, `pnpm-lock.yaml`

| Изменение | Причина |
| --- | --- |
| `payload` и все `@payloadcms/*` → **3.90.2** (единая версия, в `pnpm.overrides` тоже) | Актуальная версия; все пакеты Payload обязаны быть одной версии. Раньше `plugin-search` был `^3.88.0` при override `3.87.1` — расхождение |
| `next` → **16.3.6** | Payload 3.90.2 требует Next `>=16.3.3` |
| `react`, `react-dom` → 19.2.8; `sharp` → 0.34.5; `eslint-config-next` → 16.3.6; `@types/node` → 22.20.4 | Патч-обновления, синхронизация с Next |
| Удалён `aws-sdk` (v2) | Нигде не использовался; хранилище работает через `@payloadcms/storage-s3` |
| Добавлено `packageManager: pnpm@10.34.5` | Одинаковая версия pnpm локально и в Docker |
| Новые скрипты `migrate`, `migrate:create`, `migrate:status` | Работа с миграциями БД |
| `pnpm-lock.yaml` пересоздан | Прежний был пустой заглушкой — `pnpm install --frozen-lockfile` в Dockerfile падал |

### Сборка и Docker

| Файл | Изменение | Причина |
| --- | --- | --- |
| `next.config.ts` | `output: 'standalone'`; убран `turbopack.root: '../../'` | Standalone нужен Dockerfile; `../../` — остаток монорепозитория, в контейнере указывал бы на `/` |
| `Dockerfile` | Переписан: pnpm 10, кэш pnpm-store, non-root пользователь, `HEALTHCHECK`, порядок стадий deps → builder → runner | Прежний не собирался (пустой lock-файл, нет `public/`), не знал про pnpm-версию |
| `public/.gitkeep` | Создан | Dockerfile копирует `public/`, папки не было |
| `.dockerignore` | Новый | Не тащить в образ `.env`, `node_modules`, тесты, секреты |

### Конфигурация приложения

| Файл | Изменение | Причина |
| --- | --- | --- |
| `src/lib/urls.ts` (новый) | `CMS_URL`, `FRONTEND_URL` (список через запятую), `COOKIE_DOMAIN`; `allowedOrigins`; в production localhost не добавляется | Раньше URL были на `localhost` и `NEXT_PUBLIC_APP_URL`, который Next может вшить в бандл при сборке образа |
| `src/payload.config.ts` | URL из `lib/urls.ts`; `prodMigrations: migrations` | В production Drizzle push отключён — без миграций таблицы не создаются |
| `src/migrations/*` (новые) | Начальная миграция `initial` (20 таблиц) | Разворачивает схему в БД `movhub` при первом старте контейнера |
| `src/collections/users/config.ts` | `auth: { cookies: { secure, sameSite: 'Lax', domain? } }` | За HTTPS (Traefik) cookie должна быть `Secure` |
| `src/lib/storage/s3.ts` | На этапе `next build` вместо ошибки подставляются заглушки | В Docker-сборке runtime-переменных ещё нет; в рантайме проверка остаётся строгой |
| `src/app/(frontend)/page.tsx` | `export const dynamic = 'force-dynamic'` | Страница обращается к БД; при пререндере в `next build` сборка бы упала (БД недоступна) |
| `src/app/(payload)/admin/importMap.js` | Перегенерирован | Только порядок импортов, поведение прежнее |

### Деплой

| Файл | Назначение |
| --- | --- |
| `docker-compose.yml` | **Dokploy (Compose):** только сервис `cms` + Traefik-лейблы для `cms.otakuum.ru`, сеть `dokploy-network`. БД и MinIO подключаются переменными. Прежний файл (шаблон с MongoDB) заменён |
| `docker-compose.dev.yml` | Локально: PostgreSQL + MinIO + инициализация бакета |
| `.env.example` | Переписан: локальные значения + пример production. Прежний указывал на MongoDB |
| `dokploy.env` (отдельный файл, **не** в архиве) | Готовые значения для вкладки Environment |
| `README.md` | Обновлены переменные, скрипты, добавлены разделы «Миграции БД» и «Деплой в Dokploy» |

## 2. Переменные окружения (Dokploy → Environment)

| Переменная | Значение / назначение |
| --- | --- |
| `DATABASE_URL` | `postgresql://postgres:…@<Internal Host БД>:5432/movhub` |
| `PAYLOAD_SECRET` | Случайные 64 hex-символа (сгенерированы) |
| `CMS_URL` | `https://cms.otakuum.ru` |
| `FRONTEND_URL` | `https://otakuum.ru` — **проверьте**, это предположение |
| `S3_BUCKET` | `media` — бакет должен существовать и быть публичным на чтение |
| `S3_ENDPOINT` | Внутренний адрес вашего MinIO: `http://<internal-host>:9000` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Ключи вашего MinIO (не `minioadmin`, если MinIO виден из интернета) |
| `S3_PUBLIC_URL` | Публичный адрес файлов для браузера: `https://<домен MinIO>/media` |

## 3. Как это проверялось

Docker в среде проверки недоступен, поэтому образ целиком не собирался. Выполнены те же шаги вручную на Node 22 + PostgreSQL 16:

- `pnpm install --frozen-lockfile` по новому lock-файлу — успешно;
- `next build` **без единой runtime-переменной** (как в Docker-сборке) — успешно;
- запуск `.next/standalone/server.js` с `NODE_ENV=production` на чистой БД: миграция `initial` применилась сама, повторный старт её не повторяет;
- `/admin`, `/api/users/me`, `/api/content`, `/api/media` — 200;
- регистрация первого администратора; cookie: `Secure; HttpOnly; SameSite=Lax`;
- CORS разрешает `https://otakuum.ru`; запрос с cookie от чужого origin отклоняется (CSRF).

Не проверено: сборка образа в Docker, выпуск сертификата и маршрутизация Traefik на вашем сервере, подключение к вашим экземплярам PostgreSQL и MinIO, загрузка файла в MinIO.

## 4. Ограничения и что делать дальше

- Начальная миграция рассчитана на **пустую** БД `movhub`. Если там уже есть таблицы, миграция упадёт.
- После любого изменения коллекций: `pnpm migrate:create <имя>` → `pnpm generate:types` → коммит `src/migrations`.
- В архиве нет кода импорта Kodik (`src/lib/kodik`, `src/endpoints/kodik-import.ts`, `src/scripts/import-kodik-dump.ts`), хотя README и скрипт `import:kodik-dump` на него ссылаются; в конфиге `endpoints: []`.
- Для сервиса **Compose** не добавляйте домены в UI — роутер уже задан лейблами. Для **Application** домен, наоборот, добавляется в UI.
- Публичное чтение бакета и HTTPS-домен MinIO настраиваются на вашей стороне.
