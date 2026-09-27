import type { NodemailerAdapterArgs } from '@payloadcms/email-nodemailer'

/**
 * [Dokploy] `next build` выполняется в Docker/Dokploy на этапе сборки образа, где
 * runtime-переменных (SMTP_*, DATABASE_URL, ...) обычно ещё нет — они
 * подставляются только при запуске контейнера. Поэтому на этапе сборки
 * не падаем, а используем заглушки; в рантайме проверка остаётся строгой.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build'

/**
 * Достаёт обязательную переменную окружения и падает с понятной ошибкой,
 * если она не задана — лучше уронить старт CMS сразу, чем ловить
 * непонятные ошибки отправки писем в рантайме из-за пустых SMTP-настроек.
 */
const requireEnv = (name: string): string => {
  const value = process.env[name]?.trim()

  if (!value) {
    if (isBuildPhase) return `build-placeholder-${name.toLowerCase()}`

    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

// SMTP включён, только если задан SMTP_HOST. Если переменная не задана —
// Payload сам залогирует предупреждение при старте и на попытке отправки
// письма (dev-режим без реальной почты, например).
export const isEmailConfigured = Boolean(process.env.SMTP_HOST?.trim())

// Порт SMTP: 587 (STARTTLS) по умолчанию — подходит для большинства
// провайдеров (SendGrid, Mailgun, Yandex, Gmail с приложением-паролем и т.д.).
const smtpPort = Number(process.env.SMTP_PORT?.trim() || '587')

// secure: true нужен только для порта 465 (implicit TLS). Для 587/25 SMTP
// сам поднимает TLS через STARTTLS, и secure должен оставаться false —
// см. документацию Nodemailer по SMTP.
const smtpSecure = process.env.SMTP_SECURE?.trim() === 'true' || smtpPort === 465

// Функция, а не готовый объект: вызывается только когда isEmailConfigured
// уже true (см. payload.config.ts). Так requireEnv не падает при импорте
// модуля в окружениях без SMTP (тесты, dev без почты и т.п.) — module-level
// eager-вычисление тут было бы багом.
export const getNodemailerOptions = (): NodemailerAdapterArgs => ({
  defaultFromAddress: requireEnv('EMAIL_FROM_ADDRESS'),
  defaultFromName: process.env.EMAIL_FROM_NAME?.trim() || 'MovHub',

  transportOptions: {
    host: requireEnv('SMTP_HOST'),
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: requireEnv('SMTP_USER'),
      pass: requireEnv('SMTP_PASS'),
    },
  },
})
