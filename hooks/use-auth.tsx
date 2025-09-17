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
  register: (input: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
  }) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession>({ isAuthenticated: false, user: null, isLoading: true })
  const [opLoading, setOpLoading] = useState(false)
  const isDev = process.env.NODE_ENV !== "production"

  // Make server cookie session sync available across handlers
  const syncServerSession = async () => {
    try {
      const supabase = createBrowserSupabase()
      const { data } = await supabase.auth.getSession()
      const at = data?.session?.access_token || null
      const rt = data?.session?.refresh_token || null
      await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: at, refresh_token: rt }),
        credentials: "include",
      }).catch(() => {})
    } catch {}
  }

  useEffect(() => {
    const supabase = createBrowserSupabase()
    let mounted = true
    // Removed fallback timer; rely on actual auth events and queries to drive loading state

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

    // Admin gating is enforced server-side by middleware for admin routes; no client-side gating here

    // syncServerSession is defined above and uses a fresh client each call

    const fetchAppUser = async (authUserId: string, email?: string) => {
      if (isDev) console.log("[auth] fetchAppUser start", { authUserId, email })
      const { data, error } = await supabase.from("users").select("*").eq("id", authUserId).maybeSingle()
      if (isDev) console.log("[auth] fetchAppUser result", { error: error?.message, role: data?.role })
      if (error) {
        if (isDev) console.log("[auth] fetchAppUser error, leaving session authenticated and continuing")
        setSession((prev) => ({ ...prev, isAuthenticated: true, isLoading: false }))
        return
      }
      if (!data) {
        if (isDev) console.log("[auth] fetchAppUser no data")
        // Dev-only bootstrap to upsert current auth user as ADMIN when users row is missing
        const bootstrapKey = process.env.NEXT_PUBLIC_ADMIN_ACCESS_KEY
        if (isDev && bootstrapKey) {
          try {
            const res = await fetch(`/api/admin/bootstrap?key=${encodeURIComponent(bootstrapKey)}`, { method: "POST" })
            if (isDev) console.log("[auth] bootstrap attempted", { ok: res.ok })
            if (res.ok) {
              const { data: data2, error: error2 } = await supabase
                .from("users")
                .select("*")
                .eq("id", authUserId)
                .maybeSingle()
              if (!error2 && data2) {
                if (isDev) console.log("[auth] bootstrap success -> updating session")
                setSession({
                  isAuthenticated: true,
                  user: {
                    id: data2.id,
                    email: data2.email,
                    firstName: data2.first_name,
                    lastName: data2.last_name,
                    phone: data2.phone ?? undefined,
                    role: mapRole(data2.role),
                    isActive: data2.is_active,
                    createdAt: data2.created_at,
                    updatedAt: data2.updated_at,
                  },
                  isLoading: false,
                })
                return
              }
            }
          } catch {}
        }
        // Fallback: authenticated but no app user row
        setSession((prev) => ({ ...prev, isAuthenticated: true, isLoading: false }))
        return
      }
      if (isDev) console.log("[auth] fetchAppUser allowed -> updating session")
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
    }

    // Initial session load
    ;(async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const s = data?.session
        if (!mounted) return
        if (s?.user) {
          if (isDev) console.log("[auth] initial getSession -> user present", { userId: s.user.id, email: s.user.email })
          await fetchAppUser(s.user.id, s.user.email || undefined)
        } else {
          if (isDev) console.log("[auth] initial getSession -> no user")
          setSession({ isAuthenticated: false, user: null, isLoading: false })
        }
      } catch (_e) {
        if (!mounted) return
        if (isDev) console.log("[auth] initial getSession error", _e)
        setSession({ isAuthenticated: false, user: null, isLoading: false })
      }
    })()

    // Listen to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (isDev) console.log("[auth] onAuthStateChange", { event: _event, hasUser: !!s?.user })
      if (!mounted) return
      if (s?.user) {
        if (_event === "SIGNED_IN" || _event === "TOKEN_REFRESHED") {
          await syncServerSession()
        }
        await fetchAppUser(s.user.id, s.user.email || undefined)
      } else {
        if (isDev) console.log("[auth] onAuthStateChange -> signed out")
        try {
          await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: null, refresh_token: null }),
            credentials: "include",
          })
        } catch {}
        setSession({ isAuthenticated: false, user: null, isLoading: false })
      }
      // session state updated
    })

    return () => {
      mounted = false
      try {
        sub?.subscription?.unsubscribe?.()
      } catch {}
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setOpLoading(true)
      const supabase = createBrowserSupabase()
      if (isDev) console.log("[auth] login attempt", { email })
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (isDev) console.log("[auth] login error", error.message)
        return { success: false, error: error.message }
      }
      // Server-side middleware enforces admin-only routes; client only syncs session
      await syncServerSession()
      if (isDev) console.log("[auth] login success -> session synced; waiting for onAuthStateChange")
      return { success: true }
    } catch (e: any) {
      if (isDev) console.log("[auth] login exception", e?.message)
      return { success: false, error: e?.message || "Login failed" }
    }
    finally {
      setOpLoading(false)
    }
  }

  const logout = async () => {
    const supabase = createBrowserSupabase()
    if (isDev) console.log("[auth] logout called - starting process")
    
    try {
      if (isDev) console.log("[auth] step 1: calling supabase.auth.signOut() with timeout")
      
      // Add timeout to prevent hanging
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('signOut timeout')), 5000)
      )
      
      const { error } = await Promise.race([signOutPromise, timeoutPromise]) as any
      if (isDev) console.log("[auth] step 1 completed - signOut result:", { error: error?.message })
      
    } catch (e: any) {
      if (isDev) console.log("[auth] signOut failed or timed out:", e.message)
      // Continue with logout process even if signOut fails
    }
    
    try {
      if (isDev) console.log("[auth] step 2: calling /api/auth/sync")
      // Sync with server to clear cookies
      const syncResponse = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: null, refresh_token: null }),
        credentials: "include",
      })
      if (isDev) console.log("[auth] step 2 completed - sync response:", { 
        ok: syncResponse.ok, 
        status: syncResponse.status 
      })
    } catch (e) {
      if (isDev) console.log("[auth] sync failed:", e)
      // Continue even if sync fails
    }
    
    if (isDev) console.log("[auth] step 3: clearing local session state")
    // Always clear local session state
    setSession({ isAuthenticated: false, user: null, isLoading: false })
    if (isDev) console.log("[auth] step 3 completed - local session cleared")
    if (isDev) console.log("[auth] logout function completed")
  }

  const register = async (input: { email: string; password: string; firstName: string; lastName: string; phone?: string }) => {
    try {
      setOpLoading(true)
      const supabase = createBrowserSupabase()
      const { email, password, firstName, lastName, phone } = input
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { firstName, lastName, phone } },
      })
      if (error) return { success: false, error: error.message }
      // User may need to verify email depending on Supabase settings
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message || "Registration failed" }
    } finally {
      setOpLoading(false)
    }
  }

  return <AuthContext.Provider value={{ session, login, logout, register, isLoading: session.isLoading || opLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
