# Обновление под Dokploy — cms-main-dokploy

Дата: 24.09.2026 · Целевой домен: **cms.otakuum.ru** · БД: `movhub` (PostgreSQL в составе compose-стека)

В коде все изменённые места помечены комментарием `[Dokploy]` — найти их можно поиском:

```bash
grep -rn "\[Dokploy\]" src next.config.ts pnpm-workspace.yaml Dockerfile docker-compose*.yml
```

## Ревизия 6 — статус релиза (анонс / выходит / вышло)

- В коллекцию `content` добавлено поле **`releaseStatus`** (select: `anons` / `ongoing` / `released`, проиндексировано, в сайдбаре админки). Нужно kodik-pipeline: команда `update-ongoing` по нему находит сериалы, у которых выходят серии, и переводит завершившиеся в `released`.
- Новая миграция **`20260928_193844_add_release_status`** (колонки `content.release_status`, `_content_v.version_release_status`, два enum-типа, два индекса) + обновлённый снимок схемы `.json`. Применяется автоматически при старте контейнера (`prodMigrations`). Миграция идемпотентна: если колонки уже были созданы вручную как `VARCHAR`, они приводятся к enum (значения вне списка обнуляются).
- Удалён скрипт `import:kodik-dump` из `package.json` (файла `src/scripts/import-kodik-dump.ts` в проекте нет); README очищен от описания несуществующего `POST /api/import/kodik`, `KODIK_API_TOKEN` и `src/lib/kodik` — импорт делает kodik-pipeline.
- Порядок выкладки: 1) задеплоить CMS (миграция применится сама); 2) в пайплайне выполнить `sync` один раз; 3) включить расписание `update-ongoing`.

## Ревизия 3 — в Dokploy запускается только CMS

PostgreSQL и MinIO — отдельные сервисы проекта Dokploy, поэтому `docker-compose.yml` теперь содержит **только `cms`** (и лейблы Traefik). Подключение к БД и S3 — только через переменные окружения: `DATABASE_URL` (Internal Host БД) и `S3_ENDPOINT` / `S3_PUBLIC_URL` / ключи (внутренний и публичный адреса вашего MinIO). Промежуточная версия с PostgreSQL внутри стека отменена.

Рекомендуемый тип сервиса — **Application** (Build Type: Dockerfile), домен добавляется в UI; сервис **Compose** тоже работает. Ошибка `ENOTFOUND my-first-project-database-*` означает, что внутренний хост БД не найден: проверьте, что БД в статусе Running, что Internal Host скопирован из карточки БД точно, и что CMS и БД на одном сервере.

## Ревизия 5 — Contact endpoint для apps/web

Добавлен публичный (без auth) REST-endpoint `POST /api/contact-message` (`src/endpoints/contact-message.ts`), подключённый в `payload.config.ts` через `endpoints: [contactMessageEndpoint]`. Он принимает форму обратной связи с фронтенда (`apps/web`) и отправляет письмо через уже настроенный здесь `email`-адаптер (`payload.sendEmail(...)`) — так у фронтенда нет собственных SMTP-учётных данных, вся отправка идёт через CMS.

Валидация (имя/email/длина сообщения), honeypot-поле `website` против ботов и простой in-memory rate-limit (5 писем/час с IP) продублированы здесь намеренно (defense in depth) — этот endpoint публичный и может быть вызван напрямую, в обход фронтенда.

**Новая переменная окружения:** `CONTACT_EMAIL_TO` — куда падают сообщения из формы. Если не задана или SMTP не настроен (`isEmailConfigured === false`) — endpoint отвечает `503`, а не пытается отправить с пустыми настройками.

**Требование к CORS/CSRF:** запрос идёт с origin `apps/web` (`https://otakuum.ru`), он уже входит в `allowedOrigins` (`FRONTEND_URL`, см. `src/lib/urls.ts`) — отдельно ничего настраивать не нужно.

Не проверено: реальная отправка письма через этот endpoint (нужен работающий SMTP и запущенный сервер).

## Ревизия 4 — Email (SMTP / Nodemailer)

Payload по умолчанию не умеет отправлять письма (сброс пароля, верификация новых пользователей и т.д.) — без адаптера он только логирует предупреждение при старте и на каждой попытке отправки. Добавлен адаптер `@payloadcms/email-nodemailer` через SMTP.

| Файл | Изменение |
| --- | --- |
| `package.json`, `pnpm.overrides` | Добавлен `@payloadcms/email-nodemailer` версии `3.90.2` (единая версия со всеми `@payloadcms/*`) |
| `src/lib/email/nodemailer.ts` (новый) | Собирает `NodemailerAdapterArgs` из `SMTP_*` / `EMAIL_FROM_*`; `isEmailConfigured` — включён ли email вообще (по наличию `SMTP_HOST`); `getNodemailerOptions()` — **функция**, а не готовый объект, чтобы `requireEnv` не падал при импорте модуля, если email не настроен (тесты, dev без почты) |
| `src/payload.config.ts` | `email: isEmailConfigured ? nodemailerAdapter(getNodemailerOptions()) : undefined` |
| `.env.example` | Добавлены `SMTP_HOST`, `SMTP_PORT` (по умолчанию 587), `SMTP_SECURE` (true только для порта 465, implicit TLS), `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` |

**Переменные окружения (Dokploy → Environment), дополнительно к разделу 2:**

| Переменная | Значение / назначение |
| --- | --- |
| `SMTP_HOST` | Хост вашего SMTP-провайдера (SendGrid, Mailgun, Яндекс.Почта, Resend SMTP и т.п.). Если не задан — email отключён, ошибок не будет |
| `SMTP_PORT` | `587` (STARTTLS, по умолчанию) или `465` (implicit TLS) |
| `SMTP_SECURE` | `true`, только если порт `465`; иначе `false` |
| `SMTP_USER` / `SMTP_PASS` | Учётные данные SMTP |
| `EMAIL_FROM_ADDRESS` | Адрес отправителя, например `no-reply@otakuum.ru` |
| `EMAIL_FROM_NAME` | Имя отправителя, по умолчанию `MovHub` |

**Lockfile:** `pnpm-lock.yaml` пересобран под новую зависимость и `overrides` (`pnpm install --no-frozen-lockfile`), проверено, что `pnpm install --frozen-lockfile` проходит чисто — билд в Dockerfile падать не будет.

Не проверено: реальная отправка письма через ваш SMTP (нужны настоящие учётные данные провайдера).

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
- Импорта Kodik внутри CMS нет — его выполняет отдельный kodik-pipeline (см. README, «Импорт из Kodik»).
- Для сервиса **Compose** не добавляйте домены в UI — роутер уже задан лейблами. Для **Application** домен, наоборот, добавляется в UI.
- Публичное чтение бакета и HTTPS-домен MinIO настраиваются на вашей стороне.


---

## Обновление 2026-10-03: безопасность, модель данных, связка с фронтендом

Порядок выкатки: **сначала CMS, потом фронтенд** (фронтенд теперь запрашивает
поле `franchiseId`, которого в старой CMS нет). Миграция
`20261003_120000_hardening_and_franchise` применится сама при старте контейнера.

### Что изменилось

- **Пользователи**: полный доступ ко всем записям `users` только у admin.
  Editor, как и обычный user, видит и правит только себя (раньше мог сменить
  email/пароль админа).
- **Черновики**: публичное чтение `content` отдаёт только `_status = 'published'`.
  Миграция помечает все существующие записи опубликованными, так что сайт не
  изменится. **Пайплайн должен писать `_status = 'published'` в новые записи**
  (в БД у колонки `DEFAULT 'draft'`), иначе новые тайтлы не появятся на сайте.
  Пока пайплайн не поправлен — `CONTENT_PUBLIC_DRAFTS=true` возвращает старое
  поведение. Поле `status` (draft/published) больше ни на что не влияет.
- **GraphQL**: Playground и интроспекция выключены. Для `pnpm codegen` фронтенда
  запускайте локальную CMS (`pnpm dev`) или временно `GRAPHQL_INTROSPECTION=true`.
- **Корень cms.otakuum.ru** редиректит на сайт (FRONTEND_URL), CMS помечена
  `noindex`.
- **Content**: `titleEn` больше не unique (ремейки), `useAsTitle = titleRu`,
  slug транслитерирует кириллицу и разруливает коллизии (год → kodikId),
  индексы по `type`, `releaseYear`, `rating`, `titleEn`, новое поле
  `franchiseId` (см. ниже), `versions.maxPerDoc = 10`.
- **Join-поля**: у `content.seasons` лимит 100, у `seasons.episodes` — 500
  (раньше 10 по умолчанию).
- **Favorites**: дубль → `ValidationError` (400), владелец подставляется до
  проверки дубля, уникальный индекс `(user_id, content_id)` в БД.
- **Media**: допустимы только jpeg/png/webp/avif/gif.
- **Auth**: сессия 7 дней, блокировка на 10 минут после 5 неверных паролей.
- **Healthcheck**: `/api/health` (один лёгкий запрос к БД).
- **Форма обратной связи**: IP берётся справа из `x-forwarded-for`
  (`TRUSTED_PROXY_HOPS`), карта лимитов чистится; Traefik-лейблы ограничивают
  `/api/contact-message` до 20 запросов в минуту.
- **docker-compose.yml**: добавлены `SMTP_*`, `EMAIL_FROM_*`, `CONTACT_EMAIL_TO`
  (раньше в контейнер не передавались, и письма не уходили).

### Новые переменные окружения (Dokploy → Environment)

| Переменная | Назначение |
|---|---|
| `REVALIDATE_URL`, `REVALIDATE_SECRET` | мгновенный сброс кэша фронтенда после правки контента; секрет должен совпадать с фронтендом |
| `CONTENT_PUBLIC_DRAFTS` | `true` — анонимы видят черновики (временно, пока не обновлён пайплайн) |
| `GRAPHQL_INTROSPECTION` | `true` — включить Playground и интроспекцию |
| `TRUSTED_PROXY_HOPS` | `1` — Traefik; `2` — Cloudflare → Traefik |
| `SMTP_*`, `EMAIL_FROM_*`, `CONTACT_EMAIL_TO` | теперь реально пробрасываются в контейнер |

### franchiseId

Записи (сезоны) с одинаковым `franchiseId` фронтенд показывает как сезоны одного
сериала. Миграция заполнила его из `kinopoiskId`, поэтому поведение прежнее.
Для аниме без `kinopoiskId` пайплайн может писать сюда общий идентификатор
франшизы (например, общий для всех сезонов `shikimoriId` первого сезона).

### Пайплайн (прямые вставки в БД)

Прямые SQL-вставки не вызывают хуки Payload, поэтому:
1. новые записи `content` нужно вставлять с `_status = 'published'`;
2. после `sync` / `update-ongoing` вызовите сброс кэша фронтенда:
   `curl -X POST -H "x-revalidate-secret: $REVALIDATE_SECRET" https://otakuum.ru/api/revalidate`
3. индекс `search-results` (плагин поиска) прямые вставки не пополняют — сайт
   теперь ищет по `content` напрямую и от него не зависит.

### После выкатки

Выполните `pnpm generate:types` (появилось поле `franchiseId`) и закоммитьте
`payload-types.ts`, если вы его храните в репозитории.
