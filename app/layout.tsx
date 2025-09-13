import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans as geistSans } from "geist/font/sans"
import { GeistMono as geistMono } from "geist/font/mono"
import { AuthProvider } from "@/hooks/use-auth"
import { DevTools } from "@/components/dev/dev-tools"
import { PWAWrapper } from "@/components/pwa/pwa-wrapper"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Oakwood Commons HOA",
  description: "Homeowners Association community management app",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HOA App",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Oakwood Commons HOA",
    title: "Oakwood Commons HOA",
    description: "Homeowners Association community management app",
  },
  twitter: {
    card: "summary",
    title: "Oakwood Commons HOA",
    description: "Homeowners Association community management app",
  },
}

export const viewport: Viewport = {
  themeColor: "#1f2937",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.jpg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HOA App" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        {process.env.NODE_ENV === "production" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('[PWA] Service Worker registered successfully:', registration.scope);
                      })
                      .catch(function(error) {
                        console.log('[PWA] Service Worker registration failed:', error);
                      });
                  });
                }
              `,
            }}
          />
        ) : (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Dev mode: aggressively unregister any existing SW and clear caches to avoid stale UI
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((regs) => {
                    regs.forEach((r) => r.unregister());
                  });
                }
                if (typeof caches !== 'undefined' && caches.keys) {
                  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
                }
              `,
            }}
          />
        )}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-gray-900`} style={{backgroundColor: '#111827'}}>
        <Suspense fallback={<div>Loading...</div>}>
          <AuthProvider>
            <PWAWrapper>
              {children}
              {process.env.NODE_ENV !== "production" && <DevTools />}
            </PWAWrapper>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}
