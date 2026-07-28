import { Toaster } from 'sonner'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import './globals.css'

export const metadata = {
  title: 'Medico - Unified Healthcare Platform',
  description: 'Multi-role healthcare operating system',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-[#0A1628] text-white">
        <LanguageSwitcher />
        {children}
        <Toaster position="top-right" theme="dark" richColors />
      </body>
    </html>
  )
}
