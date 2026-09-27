import type { Endpoint, PayloadRequest } from 'payload'

import { isEmailConfigured } from '../lib/email/nodemailer'

/**
 * POST /api/contact-message
 *
 * Принимает форму обратной связи — браузер бьёт сюда напрямую из
 * ContactClient.tsx (apps/web/src/components/pages/ContactClient.tsx),
 * без прокси через сервер фронтенда, — и отправляет письмо через
 * email-адаптер, уже настроенный здесь в payload.config.ts
 * (email: nodemailerAdapter(...)). Так apps/web не держит собственных
 * SMTP-учётных данных — вся отправка почты идёт через CMS.
 *
 * Вся валидация и защита (rate-limit, honeypot) — здесь, а не на фронте:
 * этот endpoint публичный (без auth) и вызывается прямо из браузера, так что
 * дублировать проверки на сервере фронтенда уже не от чего защищать.
 */

const NAME_MAX = 100
const EMAIL_MAX = 200
const MESSAGE_MIN = 10
const MESSAGE_MAX = 5000

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Тот же простой in-memory rate-limit, что был в apps/web: не более 5 писем
// в час с одного IP. Сбрасывается при рестарте процесса и не работает при
// нескольких инстансах CMS одновременно — для настоящей защиты от
// целенаправленной атаки нужен внешний rate-limiter (например, на уровне
// reverse proxy), но от случайного спам-бота этого достаточно.
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 60 * 60 * 1000
const hits = new Map<string, number[]>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)

  if (timestamps.length >= RATE_LIMIT) {
    hits.set(ip, timestamps)
    return true
  }

  timestamps.push(now)
  hits.set(ip, timestamps)
  return false
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function getClientIp(req: PayloadRequest): string {
  // За прокси (Dokploy/nginx) реальный IP приходит в x-forwarded-for.
  // req.headers — это Web Headers (см. тип PayloadRequest), а не Node IncomingHttpHeaders.
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || 'unknown'
}

const handler = async (req: PayloadRequest): Promise<Response> => {
  if (!isEmailConfigured) {
    req.payload.logger.error('POST /api/contact-message: SMTP не настроен (нет SMTP_HOST)')
    return json({ message: 'Отправка писем сейчас недоступна, попробуйте позже' }, 503)
  }

  const recipient = process.env.CONTACT_EMAIL_TO?.trim()
  if (!recipient) {
    req.payload.logger.error(
      'POST /api/contact-message: не задана переменная окружения CONTACT_EMAIL_TO',
    )
    return json({ message: 'Отправка писем сейчас недоступна, попробуйте позже' }, 503)
  }

  const ip = getClientIp(req)
  if (isRateLimited(ip)) {
    return json({ message: 'Слишком много сообщений, попробуйте позже' }, 429)
  }

  let body: unknown
  try {
    // В кастомных endpoint'ах req.data (в отличие от коллекционных операций)
    // не заполнен автоматически — тело нужно читать самим, см. комментарий
    // в типе PayloadRequestData.
    body = await req.json?.()
  } catch {
    return json({ message: 'Некорректный запрос' }, 400)
  }

  const { name, email, message, website } = (body as Record<string, unknown>) ?? {}

  // Honeypot: скрытое на фронте поле, которое реальный человек не заполняет.
  // Если оно непустое — это бот; отвечаем "успехом" без реальной отправки,
  // чтобы не подсказывать боту, что его вычислили.
  if (typeof website === 'string' && website.trim() !== '') {
    return json({ ok: true }, 200)
  }

  if (typeof name !== 'string' || typeof email !== 'string' || typeof message !== 'string') {
    return json({ message: 'Заполните все поля' }, 400)
  }

  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const trimmedMessage = message.trim()

  if (!trimmedName || trimmedName.length > NAME_MAX) {
    return json({ message: 'Некорректное имя' }, 400)
  }

  if (!EMAIL_RE.test(trimmedEmail) || trimmedEmail.length > EMAIL_MAX) {
    return json({ message: 'Некорректный email' }, 400)
  }

  if (trimmedMessage.length < MESSAGE_MIN || trimmedMessage.length > MESSAGE_MAX) {
    return json(
      { message: `Сообщение должно быть от ${MESSAGE_MIN} до ${MESSAGE_MAX} символов` },
      400,
    )
  }

  try {
    await req.payload.sendEmail({
      to: recipient,
      // Позволяет ответить пользователю прямо из почтового клиента (Reply),
      // даже если From — технический no-reply (defaultFromAddress адаптера).
      replyTo: trimmedEmail,
      subject: `Обратная связь с сайта: ${trimmedName}`,
      text: `Имя: ${trimmedName}\nEmail: ${trimmedEmail}\n\n${trimmedMessage}`,
      html: `
        <p><strong>Имя:</strong> ${escapeHtml(trimmedName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(trimmedEmail)}</p>
        <p><strong>Сообщение:</strong></p>
        <p>${escapeHtml(trimmedMessage).replace(/\n/g, '<br />')}</p>
      `,
    })

    return json({ ok: true }, 200)
  } catch (error) {
    // Сюда попадают, например, ошибки авторизации SMTP (535) — сама
    // проверка входных данных выше уже прошла, значит проблема на стороне
    // почтового провайдера/сети, а не в запросе пользователя.
    req.payload.logger.error({ err: error }, 'POST /api/contact-message: не удалось отправить письмо')

    return json({ message: 'Не удалось отправить сообщение, попробуйте позже' }, 502)
  }
}

export const contactMessageEndpoint: Endpoint = {
  path: '/contact-message',
  method: 'post',
  handler,
}
