"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw, X } from "lucide-react"
import { toast } from "sonner"

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    // Listen for service worker update messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'APP_UPDATE_AVAILABLE') {
        console.log('[App] Update available:', event.data.version)
        setUpdateAvailable(true)
        
        // Show toast notification
        toast.info("App update available!", {
          description: "A new version of the app is ready. Refresh to get the latest features.",
          duration: 10000,
          action: {
            label: "Refresh",
            onClick: handleRefresh
          }
        })
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    // Check for service worker updates periodically
    const checkForUpdates = () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' })
      }
    }

    // Check for updates every 5 minutes
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000)

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
      clearInterval(interval)
    }
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    try {
      // Send message to service worker to clear caches
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel()
        
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            // Force reload the page
            window.location.reload()
          }
        }
        
        navigator.serviceWorker.controller.postMessage(
          { type: 'FORCE_REFRESH' },
          [messageChannel.port2]
        )
      } else {
        // Fallback: just reload
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to refresh:', error)
      // Fallback: just reload
      window.location.reload()
    }
  }

  const handleDismiss = () => {
    setUpdateAvailable(false)
  }

  if (!updateAvailable) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <Alert className="rounded-none border-x-0 border-t-0 bg-blue-50 border-blue-200">
        <RefreshCw className="h-4 w-4 text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-blue-800">
            A new version of the app is available with the latest updates.
          </span>
          <div className="flex items-center space-x-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-6 text-xs bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Update Now
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  )
}
