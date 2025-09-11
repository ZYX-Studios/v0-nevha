// Offline storage utilities for PWA functionality

export interface OfflineData {
  announcements: any[]
  issues: any[]
  userProfile: any
  lastSync: string
}

export class OfflineStorage {
  private static readonly STORAGE_KEY = "hoa_offline_data"
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  static async saveData(data: Partial<OfflineData>): Promise<void> {
    try {
      const existingData = this.getData()
      const updatedData = {
        ...existingData,
        ...data,
        lastSync: new Date().toISOString(),
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedData))
      }
    } catch (error) {
      console.error("Failed to save offline data:", error)
    }
  }

  static getData(): OfflineData {
    if (typeof window === "undefined") {
      return {
        announcements: [],
        issues: [],
        userProfile: null,
        lastSync: "",
      }
    }

    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (data) {
        return JSON.parse(data)
      }
    } catch (error) {
      console.error("Failed to load offline data:", error)
    }

    return {
      announcements: [],
      issues: [],
      userProfile: null,
      lastSync: "",
    }
  }

  static isDataStale(): boolean {
    const data = this.getData()
    if (!data.lastSync) return true

    const lastSync = new Date(data.lastSync)
    const now = new Date()
    return now.getTime() - lastSync.getTime() > this.CACHE_DURATION
  }

  static clearData(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEY)
    }
  }

  static async syncData(): Promise<void> {
    // In a real app, this would sync with the server
    console.log("[PWA] Syncing offline data...")

    // Simulate sync delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Update last sync time
    const data = this.getData()
    data.lastSync = new Date().toISOString()

    if (typeof window !== "undefined") {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data))
    }
  }
}
