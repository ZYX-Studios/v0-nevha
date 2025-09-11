"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { mockUsers } from "@/lib/mock-data"
import type { User } from "@/lib/types"

interface AuthSession {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
}

interface AuthContextType {
  session: AuthSession
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  })

  useEffect(() => {
    // Check for existing session in localStorage
    const savedUser = localStorage.getItem("hoa-user")
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser)
        setSession({
          isAuthenticated: true,
          user,
          isLoading: false,
        })
      } catch {
        localStorage.removeItem("hoa-user")
        setSession((prev) => ({ ...prev, isLoading: false }))
      }
    } else {
      setSession((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const login = async (email: string, password: string) => {
    // For demo purposes, accept any password for existing users
    const user = mockUsers.find((u) => u.email === email)

    if (user) {
      const userWithoutPassword = { ...user }
      localStorage.setItem("hoa-user", JSON.stringify(userWithoutPassword))
      setSession({
        isAuthenticated: true,
        user: userWithoutPassword,
        isLoading: false,
      })
      return { success: true }
    }

    return { success: false, error: "Invalid email or password" }
  }

  const logout = () => {
    localStorage.removeItem("hoa-user")
    setSession({
      isAuthenticated: false,
      user: null,
      isLoading: false,
    })
  }

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    // Check if user already exists
    const existingUser = mockUsers.find((u) => u.email === email)
    if (existingUser) {
      return { success: false, error: "User already exists" }
    }

    // In a real app, this would create a new user in the database
    const newUser: User = {
      id: `user_${Date.now()}`,
      email,
      firstName,
      lastName,
      phone: "",
      role: "homeowner",
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Add to mock users (in real app, this would be a database call)
    mockUsers.push(newUser)

    localStorage.setItem("hoa-user", JSON.stringify(newUser))
    setSession({
      isAuthenticated: true,
      user: newUser,
      isLoading: false,
    })

    return { success: true }
  }

  return <AuthContext.Provider value={{ session, login, logout, register }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
