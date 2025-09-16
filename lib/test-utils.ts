// Testing utilities and helpers for the HOA PWA

import type { User, Homeowner, Announcement, Issue, CarSticker } from "./types"
import { DemoDataGenerator } from "./demo-data-generator"

// Test user credentials for easy testing
export const TEST_CREDENTIALS = {
  admin: {
    email: "admin@oakwoodcommons.com",
    password: "admin123",
    role: "admin" as const,
  },
  staff: {
    email: "staff@oakwoodcommons.com",
    password: "staff123",
    role: "staff" as const,
  },
  homeowner: {
    email: "john.doe@email.com",
    password: "homeowner123",
    role: "homeowner" as const,
  },
} as const

// Factory functions for creating test data
export class TestDataFactory {
  static createUser(overrides: Partial<User> = {}): User {
    return {
      id: Math.random().toString(36).substr(2, 9),
      email: `test${Date.now()}@example.com`,
      firstName: "Test",
      lastName: "User",
      phone: "555-0000",
      role: "homeowner",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }
  }

  static createHomeowner(overrides: Partial<Homeowner> = {}): Homeowner {
    return {
      id: Math.random().toString(36).substr(2, 9),
      userId: Math.random().toString(36).substr(2, 9),
      propertyAddress: "123 Test Street",
      unitNumber: "T1",
      moveInDate: "2024-01-01",
      isOwner: true,
      emergencyContactName: "Emergency Contact",
      emergencyContactPhone: "555-9999",
      notes: "Test homeowner",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }
  }

  static createAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
    return {
      id: Math.random().toString(36).substr(2, 9),
      title: "Test Announcement",
      content: "This is a test announcement for development purposes.",
      authorId: Math.random().toString(36).substr(2, 9),
      priority: "normal",
      isPublished: true,
      publishDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }
  }

  static createIssue(overrides: Partial<Issue> = {}): Issue {
    return {
      id: Math.random().toString(36).substr(2, 9),
      reporterId: Math.random().toString(36).substr(2, 9),
      title: "Test Issue",
      description: "This is a test issue for development purposes.",
      category: "Maintenance",
      priority: "normal",
      status: "not_started",
      location: "Test Location",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }
  }

  static createCarSticker(overrides: Partial<CarSticker> = {}): CarSticker {
    return {
      id: Math.random().toString(36).substr(2, 9),
      homeownerId: Math.random().toString(36).substr(2, 9),
      stickerNumber: `TEST${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, "0")}`,
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleYear: 2022,
      vehicleColor: "Blue",
      licensePlate: "TEST123",
      issueDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides,
    }
  }
}

// Mock API responses for testing
export const mockApiResponses = {
  login: {
    success: { success: true, user: TestDataFactory.createUser() },
    failure: { success: false, error: "Invalid credentials" },
  },

  announcements: {
    list: [
      TestDataFactory.createAnnouncement({ title: "Pool Maintenance", priority: "high" }),
      TestDataFactory.createAnnouncement({ title: "Community Meeting", priority: "normal" }),
      TestDataFactory.createAnnouncement({ title: "Parking Reminder", priority: "low" }),
    ],
  },

  issues: {
    list: [
      TestDataFactory.createIssue({ title: "Broken Light", status: "not_started", priority: "high" }),
      TestDataFactory.createIssue({ title: "Noise Complaint", status: "in_progress", priority: "normal" }),
      TestDataFactory.createIssue({ title: "Landscaping", status: "resolved", priority: "low" }),
    ],
  },
}

// Test scenarios for different user flows
export const testScenarios = {
  // New user registration flow
  newUserRegistration: {
    userData: {
      firstName: "New",
      lastName: "Resident",
      email: "new.resident@email.com",
      phone: "555-1234",
      password: "newuser123",
    },
    homeownerData: {
      propertyAddress: "999 New Street",
      unitNumber: "N1",
      moveInDate: new Date().toISOString().split("T")[0],
      isOwner: true,
      emergencyContactName: "Emergency Person",
      emergencyContactPhone: "555-9876",
    },
  },

  // Issue reporting flow
  issueReporting: {
    urgentIssue: {
      title: "Water Leak Emergency",
      description: "Major water leak in the basement causing flooding",
      category: "Plumbing",
      priority: "urgent" as const,
      location: "Building A Basement",
    },
    normalIssue: {
      title: "Burnt Out Light Bulb",
      description: "Light bulb in hallway needs replacement",
      category: "Maintenance",
      priority: "normal" as const,
      location: "Building B Hallway",
    },
  },

  // Admin workflows
  adminWorkflows: {
    createAnnouncement: {
      title: "Important Community Update",
      content: "This is an important update for all residents regarding upcoming changes.",
      priority: "high" as const,
      isPublished: true,
    },
    resolveIssue: {
      issueId: "test-issue-id",
      newStatus: "resolved" as const,
      resolutionNotes: "Issue has been resolved by maintenance team.",
    },
  },
}

// Performance testing helpers
export const performanceHelpers = {
  measurePageLoad: (pageName: string) => {
    const startTime = performance.now()
    return {
      end: () => {
        const endTime = performance.now()
        const loadTime = endTime - startTime
        console.log(`[Performance] ${pageName} loaded in ${loadTime.toFixed(2)}ms`)
        return loadTime
      },
    }
  },

  measureApiCall: async (apiCall: () => Promise<any>, apiName: string) => {
    const startTime = performance.now()
    try {
      const result = await apiCall()
      const endTime = performance.now()
      const duration = endTime - startTime
      console.log(`[Performance] ${apiName} completed in ${duration.toFixed(2)}ms`)
      return { result, duration }
    } catch (error) {
      const endTime = performance.now()
      const duration = endTime - startTime
      console.error(`[Performance] ${apiName} failed after ${duration.toFixed(2)}ms:`, error)
      throw error
    }
  },
}

// Accessibility testing helpers
export const a11yHelpers = {
  checkFocusManagement: () => {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    console.log(`[A11Y] Found ${focusableElements.length} focusable elements`)
    return focusableElements
  },

  checkAriaLabels: () => {
    const elementsNeedingLabels = document.querySelectorAll(
      "button:not([aria-label]):not([aria-labelledby]), input:not([aria-label]):not([aria-labelledby])",
    )
    if (elementsNeedingLabels.length > 0) {
      console.warn(`[A11Y] ${elementsNeedingLabels.length} elements missing aria labels`)
    }
    return elementsNeedingLabels
  },

  checkColorContrast: () => {
    // This would integrate with a color contrast checking library in a real implementation
    console.log("[A11Y] Color contrast check would run here")
  },
}

// Development utilities
export const devUtils = {
  // Clear all local storage data
  clearAllData: () => {
    if (typeof window !== "undefined") {
      localStorage.clear()
      sessionStorage.clear()
      console.log("[Dev] All local data cleared")
    }
  },

  // Populate with test data
  populateTestData: () => {
    if (typeof window !== "undefined") {
      const testUser = TestDataFactory.createUser({
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        role: "homeowner",
      })

      localStorage.setItem("hoa_auth_session", JSON.stringify(testUser))
      console.log("[Dev] Test user session created")
    }
  },

  // Log current app state
  logAppState: () => {
    if (typeof window !== "undefined") {
      const authSession = localStorage.getItem("hoa_auth_session")
      const offlineData = localStorage.getItem("hoa_offline_data")

      console.log("[Dev] Current app state:", {
        isAuthenticated: !!authSession,
        user: authSession ? JSON.parse(authSession) : null,
        offlineData: offlineData ? JSON.parse(offlineData) : null,
        url: window.location.href,
        userAgent: navigator.userAgent,
        isOnline: navigator.onLine,
      })
    }
  },
}

// Export everything for easy access in development
export default {
  TEST_CREDENTIALS,
  TestDataFactory,
  mockApiResponses,
  testScenarios,
  performanceHelpers,
  a11yHelpers,
  devUtils,
}

export { DemoDataGenerator }
