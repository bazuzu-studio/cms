/**
 * Сообщает фронтенду (apps/web), что контент изменился, чтобы тот сбросил
 * кэш (revalidateTag('content')) сразу, а не через 60 секунд.
 *
 * Включается переменными окружения:
 *   REVALIDATE_URL    — адрес фронтенда, доступный из контейнера CMS
 *                       (например http://web:3000 в dokploy-network или
 *                       https://otakuum.ru)
 *   REVALIDATE_SECRET — общий секрет, тот же, что в окружении фронтенда
 *
 * Без них функция ничего не делает. Запросы дебаунсятся: при массовых
 * правках (импорт через Local API, пакетное редактирование) уходит один
 * вызов, а не сотни. Ошибки никогда не пробрасываются — сохранение записи
 * не должно зависеть от доступности фронтенда.
 */

const DEBOUNCE_MS = 3000

let timer: ReturnType<typeof setTimeout> | null = null

async function ping(): Promise<void> {
  const base = process.env.REVALIDATE_URL?.trim().replace(/\/+$/, '')
  const secret = process.env.REVALIDATE_SECRET?.trim()
  if (!base || !secret) return

  try {
    const response = await fetch(`${base}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': secret },
      body: JSON.stringify({ tag: 'content' }),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[revalidate] фронтенд ответил ${response.status}`)
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[revalidate] не удалось уведомить фронтенд:', error)
  }
}

export function scheduleFrontendRevalidate(): void {
  if (!process.env.REVALIDATE_URL || !process.env.REVALIDATE_SECRET) return

  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void ping()
  }, DEBOUNCE_MS)
}
