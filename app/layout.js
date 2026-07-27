export const metadata = {
  title: 'PoolDesk',
  description: 'Управление бассейном',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
