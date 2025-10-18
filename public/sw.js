// Service Worker for PWA offline functionality

const CACHE_VERSION = "v3.2" // Update this when deploying changes
const CACHE_NAME = `nevha-pwa-${CACHE_VERSION}`
const STATIC_CACHE_URLS = [
  "/",
  "/announcements",
  "/auth",
  "/manifest.json",
  "/nevha-icon-192x192.png",
  "/nevha-icon-512x512.png",
  "/nevha-apple-touch-icon.png",
  "/nevha-og-image.png"
]

// Track if this is a new service worker version
let isNewVersion = false

// Install event - cache static resources
self.addEventListener("install", (event) => {
  console.log(`[SW] Installing service worker ${CACHE_VERSION}`)
  isNewVersion = true

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static resources")
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        console.log("[SW] Static resources cached")
        // Force immediate activation
        return self.skipWaiting()
      }),
  )
})

// Activate event - clean up old caches and notify clients
self.addEventListener("activate", (event) => {
  console.log(`[SW] Activating service worker ${CACHE_VERSION}`)

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        console.log("[SW] Service worker activated")
        // Take control of all clients immediately
        return self.clients.claim()
      })
      .then(() => {
        // Notify all clients about the update
        if (isNewVersion) {
          return notifyClientsOfUpdate()
        }
      }),
  )
})

// Fetch event - Network First strategy for HTML, Cache First for assets
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)

  // Skip external requests
  if (url.origin !== self.location.origin) return

  // NEVER cache API responses to avoid stale data
  if (url.pathname.startsWith("/api/")) return

  // Network First strategy for HTML pages (to get latest content)
  if (event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the new version
          if (response.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request) || caches.match("/")
        })
    )
    return
  }

  // Cache First strategy for assets (images, CSS, JS)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          return new Response("Offline")
        })
    }),
  )
})

// Background sync for when connection is restored
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag)

  if (event.tag === "background-sync") {
    event.waitUntil(
      // Perform background sync operations
      syncOfflineData(),
    )
  }
})

// Push notification handling
self.addEventListener("push", (event) => {
  console.log("[SW] Push notification received")

  const options = {
    body: event.data ? event.data.text() : "New notification from NEVHA",
    icon: "/nevha-icon-192x192.png",
    badge: "/nevha-icon-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View",
        icon: "/nevha-icon-192x192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/nevha-icon-192x192.png",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification("HOA Notification", options))
})

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.action)

  event.notification.close()

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/dashboard"))
  }
})

// Helper function for background sync
async function syncOfflineData() {
  try {
    console.log("[SW] Syncing offline data...")

    // In a real app, this would sync pending changes with the server
    // For now, we'll just simulate the sync
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log("[SW] Offline data synced successfully")
  } catch (error) {
    console.error("[SW] Failed to sync offline data:", error)
    throw error
  }
}

// Notify all clients about app update
async function notifyClientsOfUpdate() {
  try {
    const clients = await self.clients.matchAll()
    console.log(`[SW] Notifying ${clients.length} clients about update`)
    
    clients.forEach(client => {
      client.postMessage({
        type: 'APP_UPDATE_AVAILABLE',
        version: CACHE_VERSION
      })
    })
  } catch (error) {
    console.error('[SW] Failed to notify clients:', error)
  }
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data && event.data.type === 'FORCE_REFRESH') {
    // Clear all caches and force refresh
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
    }).then(() => {
      // Notify client to reload
      event.ports[0]?.postMessage({ success: true })
    })
  }
})
