import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans as geistSans } from "geist/font/sans"
import { GeistMono as geistMono } from "geist/font/mono"
import { AuthProvider } from "@/hooks/use-auth"
import { DevTools } from "@/components/dev/dev-tools"
import { PWAWrapper } from "@/components/pwa/pwa-wrapper"
import { Suspense } from "react"
import { Toaster } from "sonner"
import "./globals.css"

// Build-time SW version for cache-busting the service worker file
const SW_VERSION = process.env.NEXT_PUBLIC_SW_VERSION || process.env.VERCEL_GIT_COMMIT_SHA || `${Date.now()}`

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://nevha.vercel.app'),
  title: "NEVHA App - Northfields Executive Village HOA",
  description: "Official Northfields Executive Village Homeowners Association community management app. Report issues, view announcements, and stay connected with your community.",
  generator: "v0.app",
  manifest: "/manifest.json",
  keywords: ["NEVHA", "Northfields Executive Village", "HOA", "Homeowners Association", "Community Management"],
  authors: [{ name: "NEVHA" }],
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "NEVHA App",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "NEVHA App",
    title: "NEVHA App - Northfields Executive Village HOA",
    description: "Official Northfields Executive Village Homeowners Association community management app. Report issues, view announcements, and stay connected with your community.",
    url: "https://nevha.vercel.app",
    images: [
      {
        url: "/nevha-og-image.png",
        width: 1200,
        height: 630,
        alt: "NEVHA - Northfields Executive Village Homeowners Association",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NEVHA App - Northfields Executive Village HOA",
    description: "Official Northfields Executive Village Homeowners Association community management app. Report issues, view announcements, and stay connected with your community.",
    images: ["/nevha-og-image.png"],
    creator: "@NEVHA",
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
        <link rel="apple-touch-icon" href="/nevha-apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NEVHA App" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#1f2937" />
        {process.env.NODE_ENV === "production" ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  if ('serviceWorker' in navigator) {
                    const swUrl = '/sw.js?v=${SW_VERSION}';
                    window.addEventListener('load', function() {
                      navigator.serviceWorker.register(swUrl, { updateViaCache: 'none' })
                        .then(function(registration) {
                          console.log('[PWA] Service Worker registered:', registration.scope);
                          // Force an update check on load
                          if (registration.update) {
                            registration.update();
                          }

                          // Listen for updates being found
                          registration.onupdatefound = function () {
                            const installingWorker = registration.installing;
                            if (!installingWorker) return;
                            installingWorker.onstatechange = function () {
                              if (installingWorker.state === 'installed') {
                                if (navigator.serviceWorker.controller) {
                                  // A new update is available; SW will notify the app, too
                                  console.log('[PWA] New content is available; will notify clients.');
                                } else {
                                  console.log('[PWA] Content cached for offline use.');
                                }
                              }
                            };
                          };
                        })
                        .catch(function(error) {
                          console.log('[PWA] Service Worker registration failed:', error);
                        });

                      // Reload once when the new Service Worker takes control so users see the latest site
                      (function() {
                        var reloaded = false;
                        navigator.serviceWorker.addEventListener('controllerchange', function() {
                          if (reloaded) return;
                          reloaded = true;
                          console.log('[PWA] New service worker controlling the page, reloading...');
                          window.location.reload();
                        });
                      })();
                    });
                  }
                })();
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
              {/* Global toaster for notifications */}
              <Toaster richColors position="top-right" />
            </PWAWrapper>
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}
