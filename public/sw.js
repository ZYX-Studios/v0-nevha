// Service Worker for PWA offline functionality

const CACHE_NAME = "hoa-pwa-v2"
const STATIC_CACHE_URLS = [
  "/",
  "/dashboard",
  "/announcements",
  "/auth",
  "/manifest.json",
  "/icon-192x192.jpg",
  "/icon-512x512.jpg",
]

// Install event - cache static resources
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker")

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static resources")
        return cache.addAll(STATIC_CACHE_URLS)
      })
      .then(() => {
        console.log("[SW] Static resources cached")
        return self.skipWaiting()
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker")

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
        return self.clients.claim()
      }),
  )
})

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return

  const url = new URL(event.request.url)

  // Skip external requests
  if (url.origin !== self.location.origin) return

  // IMPORTANT: Do NOT cache API responses to avoid stale data
  if (url.pathname.startsWith("/api/")) return

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("[SW] Serving from cache:", event.request.url)
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            console.log("[SW] Caching new resource:", event.request.url)
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/") || new Response("Offline - Please check your connection")
          }
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
    body: event.data ? event.data.text() : "New notification from HOA",
    icon: "/icon-192x192.jpg",
    badge: "/icon-192x192.jpg",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View",
        icon: "/icon-192x192.jpg",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icon-192x192.jpg",
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
