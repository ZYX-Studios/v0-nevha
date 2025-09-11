// Authentication utilities and session management
// Since we don't have NextAuth integration, we'll use a simple session-based approach

import type { User } from "./types"
import { mockUsers } from "./mock-data"

export interface AuthSession {
  user: User | null
  isAuthenticated: boolean
}

// Mock authentication functions for development
export class AuthService {
  private static SESSION_KEY = "hoa_auth_session"

  static async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Find user by email (in real app, this would be a secure API call)
    const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())

    if (!user) {
      return { success: false, error: "Invalid email or password" }
    }

    if (!user.isActive) {
      return { success: false, error: "Account is deactivated" }
    }

    // In a real app, you'd verify the password hash
    // For demo purposes, any password works

    // Store session
    this.setSession(user)

    return { success: true, user }
  }

  static async logout(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.SESSION_KEY)
    }
  }

  static getSession(): AuthSession {
    if (typeof window === "undefined") {
      return { user: null, isAuthenticated: false }
    }

    try {
      const sessionData = localStorage.getItem(this.SESSION_KEY)
      if (sessionData) {
        const user = JSON.parse(sessionData) as User
        return { user, isAuthenticated: true }
      }
    } catch (error) {
      console.error("Error parsing session data:", error)
    }

    return { user: null, isAuthenticated: false }
  }

  static setSession(user: User): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(user))
    }
  }

  static async register(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Check if user already exists
    const existingUser = mockUsers.find((u) => u.email.toLowerCase() === userData.email.toLowerCase())
    if (existingUser) {
      return { success: false, error: "User with this email already exists" }
    }

    // Create new user (in real app, this would be a secure API call)
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      role: "homeowner",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Add to mock data (in real app, this would be saved to database)
    mockUsers.push(newUser)

    // Store session
    this.setSession(newUser)

    return { success: true, user: newUser }
  }

  static isAdmin(user: User | null): boolean {
    return user?.role === "admin" || user?.role === "staff"
  }

  static isHomeowner(user: User | null): boolean {
    return user?.role === "homeowner"
  }
}
