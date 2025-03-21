import "@workspace/ui/globals.css"
import "@/app/styles/globals.css"

import { ThemeProvider } from "@/app/providers"
import { Pretendard } from "@/app/fonts"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${Pretendard.variable} font-sans antialiased `}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
