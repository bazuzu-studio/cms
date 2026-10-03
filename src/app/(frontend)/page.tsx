import { redirect } from 'next/navigation'

import { frontendURLs } from '@/lib/urls'

// Корень CMS не должен показывать стартовую страницу Payload (она ещё и
// светила путь к файлу на сервере). Ведём на сайт, а если FRONTEND_URL не
// задан — в админку.
export const dynamic = 'force-dynamic'

export default function HomePage() {
  redirect(frontendURLs[0] ?? '/admin')
}
