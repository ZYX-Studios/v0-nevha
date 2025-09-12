"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import type { User } from "@/lib/types"
import { createClient as createBrowserSupabase } from "@/lib/supabase/client"

interface AuthSession {
  isAuthenticated: boolean
  user: User | null
  isLoading: boolean
}

interface AuthContextType {
  session: AuthSession
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  register: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>({ isAuthenticated: false, user: null, isLoading: true })

  useEffect(() => {
    const supabase = createBrowserSupabase()

    const mapRole = (dbRole?: string): User["role"] => {
      switch (dbRole) {
        case "ADMIN":
          return "admin"
        case "STAFF":
          return "staff"
        default:
          return "homeowner"
      }
    }

    const fetchAppUser = async (authUserId: string, email?: string) => {
      const { data, error } = await supabase.from("users").select("*").eq("id", authUserId).maybeSingle()
      if (error) {
        // Non-fatal: still authenticated, but no app user
        setSession((prev) => ({
          ...prev,
          isAuthenticated: true,
          user: {
            id: authUserId,
            email: email || "",
            firstName: "",
            lastName: "",
            role: "homeowner",
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          isLoading: false,
        }))
        return
      }
      if (data) {
        setSession({
          isAuthenticated: true,
          user: {
            id: data.id,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            phone: data.phone ?? undefined,
            role: mapRole(data.role),
            isActive: data.is_active,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
          },
          isLoading: false,
        })
      } else {
        setSession((prev) => ({ ...prev, isAuthenticated: true, isLoading: false }))
      }
    }

    // Initial session load
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (s?.user) {
        await fetchAppUser(s.user.id, s.user.email || undefined)
      } else {
        setSession({ isAuthenticated: false, user: null, isLoading: false })
      }
    })

    // Listen to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (s?.user) {
        await fetchAppUser(s.user.id, s.user.email || undefined)
      } else {
        setSession({ isAuthenticated: false, user: null, isLoading: false })
      }
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || "Login failed" }
    }
  }

  const logout = async () => {
    const supabase = createBrowserSupabase()
    await supabase.auth.signOut()
    setSession({ isAuthenticated: false, user: null, isLoading: false })
  }

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const supabase = createBrowserSupabase()
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { firstName, lastName } } })
      if (error) return { success: false, error: error.message }
      // User may need to verify email depending on Supabase settings
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || "Registration failed" }
    }
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
