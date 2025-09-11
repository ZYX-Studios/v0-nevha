// Hook for managing offline state and functionality

"use client"

import { useState, useEffect } from "react"
import { OfflineStorage } from "@/lib/offline-storage"

export function useOffline() {
  const [isOnline, setIsOnline] = useState(true)
  const [isDataStale, setIsDataStale] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      if (OfflineStorage.isDataStale()) {
        syncData()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Check if data is stale
    setIsDataStale(OfflineStorage.isDataStale())

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const syncData = async () => {
    if (!isOnline) return

    setIsSyncing(true)
    try {
      await OfflineStorage.syncData()
      setIsDataStale(false)
    } catch (error) {
      console.error("Sync failed:", error)
    } finally {
      setIsSyncing(false)
    }
  }

  const saveOfflineData = async (data: any) => {
    await OfflineStorage.saveData(data)
  }

  const getOfflineData = () => {
    return OfflineStorage.getData()
  }

  return {
    isOnline,
    isDataStale,
    isSyncing,
    syncData,
    saveOfflineData,
    getOfflineData,
  }
}
