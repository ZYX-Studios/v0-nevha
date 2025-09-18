// Offline status indicator component

"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { useOffline } from "@/hooks/use-offline"
import { WifiOff } from "lucide-react"

export function OfflineIndicator() {
  const { isOnline } = useOffline()

  if (isOnline) {
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

    </div>
  )
}
