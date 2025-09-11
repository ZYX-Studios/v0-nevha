// Offline status indicator component

"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useOffline } from "@/hooks/use-offline"
import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react"

export function OfflineIndicator() {
  const { isOnline, isDataStale, isSyncing, syncData } = useOffline()

  if (isOnline && !isDataStale) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {!isOnline && (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You're offline. Some features may be limited.</span>
          </AlertDescription>
        </Alert>
      )}

      {isOnline && isDataStale && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800">Your data may be outdated.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={syncData}
              disabled={isSyncing}
              className="ml-2 h-6 text-xs bg-transparent"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Refresh
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
