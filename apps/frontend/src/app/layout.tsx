import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import { AuthProvider } from '../lib/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Timbre - AI Music Generation',
  description: 'Transform your videos with AI-generated music',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}