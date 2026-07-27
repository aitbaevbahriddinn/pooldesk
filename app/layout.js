import { Golos_Text, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const display = Golos_Text({
  subsets: ['cyrillic', 'latin'],
  weight: ['600', '700'],
  variable: '--font-display',
  display: 'swap',
})

const body = Inter({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata = {
  title: 'PoolDesk — управление бассейном',
  description: 'Бронирование и рассадка гостей на карте бассейна',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b6e8c',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
