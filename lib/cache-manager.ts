// Cache management utilities for PWA

export class CacheManager {
  /**
   * Force clear all caches and reload the app
   */
  static async forceRefresh(): Promise<void> {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        console.log('[Cache] All caches cleared')
      }

      // Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations.map(registration => registration.unregister())
        )
        console.log('[Cache] Service worker unregistered')
      }

      // Clear localStorage and sessionStorage
      localStorage.clear()
      sessionStorage.clear()
      console.log('[Cache] Storage cleared')

      // Force reload
      window.location.reload()
    } catch (error) {
      console.error('[Cache] Failed to clear caches:', error)
      // Fallback: just reload
      window.location.reload()
    }
  }

  /**
   * Check if there's a newer version of the service worker
   */
  static async checkForUpdates(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        await registration.update()
        return registration.waiting !== null
      }
      return false
    } catch (error) {
      console.error('[Cache] Failed to check for updates:', error)
      return false
    }
  }

  /**
   * Get cache information for debugging
   */
  static async getCacheInfo(): Promise<{
    cacheNames: string[]
    totalSize: number
    swVersion?: string
  }> {
    const info = {
      cacheNames: [] as string[],
      totalSize: 0,
      swVersion: undefined as string | undefined
    }

    try {
      if ('caches' in window) {
        info.cacheNames = await caches.keys()
        
        // Calculate total cache size (approximate)
        for (const cacheName of info.cacheNames) {
          const cache = await caches.open(cacheName)
          const keys = await cache.keys()
          info.totalSize += keys.length
        }
      }

      // Try to get SW version from console logs or registration
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // This would need to be implemented in the service worker
        // For now, we'll just indicate if SW is active
        info.swVersion = 'active'
      }
    } catch (error) {
      console.error('[Cache] Failed to get cache info:', error)
    }

    return info
  }

  /**
   * Add cache busting parameters to URLs
   */
  static addCacheBuster(url: string): string {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}_cb=${Date.now()}`
  }
}

// Helper function for development - adds cache clear button
export function addDevCacheClearButton(): void {
  if (process.env.NODE_ENV !== 'development') return

  // Only add if not already present
  if (document.getElementById('dev-cache-clear')) return

  const button = document.createElement('button')
  button.id = 'dev-cache-clear'
  button.textContent = '🗑️ Clear Cache'
  button.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    padding: 8px 12px;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    font-family: monospace;
  `
  
  button.addEventListener('click', () => {
    if (confirm('Clear all caches and reload?')) {
      CacheManager.forceRefresh()
    }
  })

  document.body.appendChild(button)
}
