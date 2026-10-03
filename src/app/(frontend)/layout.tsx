import React from 'react'
import './styles.css'

export const metadata = {
  title: 'MovHub CMS',
  // CMS не должна попадать в поисковую выдачу.
  robots: { index: false, follow: false },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="ru">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
