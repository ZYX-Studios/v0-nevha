"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import type { User } from "@/lib/types"
import { createClient as createBrowserSupabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { signOutAction } from "@/app/auth/actions"

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
    block?: string
    lot?: string
    phase?: string
  }) => Promise<{ success: boolean; error?: string }>
  homeownerProfile: any | null
  registrationStatus: string | null
  hasDocuments: boolean | null
  isLoading: boolean
  isInitializing: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

import { type User as SupabaseUser } from "@supabase/supabase-js"

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

export function AuthProvider({ children, initialUser, initialSessionData }: { children: ReactNode, initialUser?: SupabaseUser | null, initialSessionData?: any }) {
  const router = useRouter()

  // Initialize with server user if provided, otherwise default to loading
  const [session, setSession] = useState<AuthSession>(() => {
    if (initialUser && initialSessionData) {
      return {
        isAuthenticated: true,
        user: {
          id: initialSessionData.id || initialUser.id,
          email: initialSessionData.email || initialUser.email || "",
          role: mapRole(initialSessionData.role),
          firstName: initialSessionData.firstName || "",
          lastName: initialSessionData.lastName || "",
          isActive: initialSessionData.isActive ?? true,
          createdAt: initialSessionData.createdAt || initialUser.created_at,
          updatedAt: initialSessionData.updatedAt || initialUser.updated_at || new Date().toISOString(),
          phone: initialSessionData.phone,
        },
        isLoading: false // Server already fetched the full profile
      }
    }

    if (initialUser) {
      return {
        isAuthenticated: true,
        user: {
          id: initialUser.id,
          email: initialUser.email ?? "",
          role: "homeowner", // default, will be refined by fetchAppUser
          // Map other fields carefully or leave partial until hydration
          firstName: "",
          lastName: "",
          isActive: true, // assumption
          createdAt: initialUser.created_at,
          updatedAt: initialUser.updated_at || new Date().toISOString(),
        },
        isLoading: true // Still loading full profile
      }
    }
    return { isAuthenticated: false, user: null, isLoading: true }
  })

  const [homeownerProfile, setHomeownerProfile] = useState<any | null>(null)
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(initialSessionData?.registrationStatus || null)
  const [hasDocuments, setHasDocuments] = useState<boolean | null>(initialSessionData?.hasDocuments ?? null)
  const [opLoading, setOpLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(!initialSessionData) // If we have server data, we are done initializing
  const isDev = process.env.NODE_ENV !== "production"

  useEffect(() => {
    const supabase = createBrowserSupabase()
    let mounted = true
    let fetchInFlight = false

    // Safety timeout to ensure we never get stuck in loading state (initializing)
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        setSession(prev => {
          if (prev.isLoading) {
            return { ...prev, isLoading: false }
          }
          return prev
        })
      }
    }, 15000)

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

    // Refinement: If we have an initial session, we might want to try to map role from metadata if available
    // But for now we stick to fetching the real profile from DB


    const fetchAppUser = async (authUserId: string, email?: string) => {
      // Guard: skip if another fetchAppUser call is already in flight
      if (fetchInFlight) return
      fetchInFlight = true

      let alreadyLoaded = false;
      // Only set loading if we don't already have this user's data loaded
      setSession((prev) => {
        if (prev.user?.id === authUserId && prev.user.firstName && !prev.isLoading) {
          alreadyLoaded = true;
          return prev;
        }
        return { ...prev, isLoading: true }
      })

      if (alreadyLoaded) {
        fetchInFlight = false
        return;
      }

      try {
        // Timeout wrapper
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Query timeout")), 20000))

        const userQuery = supabase.from("users").select("*").eq("id", authUserId).maybeSingle()

        // Race the query against timeout
        const { data, error } = await Promise.race([userQuery, timeoutPromise]) as any



        if (error) {
          if (isDev) console.log("[auth] fetchAppUser error", error.message)
          setSession((prev) => ({ ...prev, isAuthenticated: true, isLoading: false }))
          return
        }

        if (!data) {
          if (isDev) console.log("[auth] fetchAppUser no data - bootstrapping or fallback")
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
                  // Recursively call for simplicity or just handle here (handling here to avoid recursion limits/complexity)
                  // For now, treat as fallback success to avoid complex nesting
                  setSession({
                    isAuthenticated: true,
                    user: {
                      id: data2.id,
                      email: data2.email,
                      firstName: data2.first_name,
                      lastName: data2.last_name,
                      role: mapRole(data2.role),
                      isActive: data2.is_active,
                      createdAt: data2.created_at,
                      updatedAt: data2.updated_at,
                    },
                    isLoading: false
                  })
                  return
                }
              }
            } catch { }
          }

          // Fallback: authenticated but no app user row
          setSession((prev) => ({ ...prev, isAuthenticated: true, isLoading: false }))
          return
        }

        let regStatus: string | null = null

        if (data.role === 'HOMEOWNER') {
          try {
            console.log("[auth] fetching registration status")
            const reqQuery = supabase
              .from("registration_requests")
              .select("status, documents")
              .eq("user_id", authUserId)
              .maybeSingle()

            const { data: req } = await Promise.race([reqQuery, timeoutPromise]) as any

            if (req) {
              regStatus = req.status
              setRegistrationStatus(req.status)
              console.log("[auth] registration status found:", req.status)
              // Redirect to onboarding ONLY if pending AND no documents submitted yet.
              // If documents exist, the user already completed onboarding and is awaiting admin review.
              const hasDocs = Array.isArray(req.documents) && req.documents.length > 0
              setHasDocuments(hasDocs)
              if (req.status === 'pending' && !hasDocs && window.location.pathname !== '/onboarding') {
                router.push('/onboarding')
              }
            } else {
              console.log("[auth] no registration request found")
            }
          } catch (e) {
            console.error("Error fetching registration status", e)
          }
        }

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
      } catch (e) {
        if (isDev) console.error("Error in fetchAppUser", e)
        setSession((prev) => ({ ...prev, isAuthenticated: true, isLoading: false }))
      } finally {
        fetchInFlight = false
      }
    }

      // IIFE to immediately invoke the initial session check
      ; (async () => {
        if (initialSessionData) return; // Server already provided the session data

        try {
          const { data: { session: s } } = await supabase.auth.getSession()
          if (!mounted) return
          if (s?.user) {
            await fetchAppUser(s.user.id, s.user.email || undefined)
          } else {
            setSession({ isAuthenticated: false, user: null, isLoading: false })
          }
        } catch (_e) {
          if (!mounted) return
          setSession({ isAuthenticated: false, user: null, isLoading: false })
        }
      })()

    // Listen to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isDev) console.log("[auth] onAuthStateChange", { event })
      if (!mounted) return

      if (session?.user) {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          router.refresh() // Ensure server components update
        }
        await fetchAppUser(session.user.id, session.user.email || undefined)
      } else if (event === "SIGNED_OUT") {
        setSession({ isAuthenticated: false, user: null, isLoading: false })
        setHomeownerProfile(null)
        setRegistrationStatus(null)
        router.refresh() // Ensure server components update
      }
    })

    return () => {
      mounted = false
      clearTimeout(safetyTimeout)
      try {
        sub?.subscription?.unsubscribe?.()
      } catch { }
    }
  }, [router])

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
      // Success - refresh router to update server state (middleware will see cookies)
      router.refresh()
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
    // Clear local state immediately for UI responsiveness
    setSession({ isAuthenticated: false, user: null, isLoading: false })
    setHomeownerProfile(null)
    setRegistrationStatus(null)

    // 0. Manual Client-Side Cookie Nuke (Belt and Suspenders)
    if (typeof document !== 'undefined') {
      document.cookie.split(";").forEach((c) => {
        const name = c.trim().split("=")[0];
        if (name.startsWith("sb-") && name.endsWith("-auth-token")) {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        }
      });
    }

    try {
      // 1. Client-side sign out (revokes token)
      await supabase.auth.signOut()
    } catch (e) {
      console.error("Client cleanup failed", e)
    }

    // 2. Server action to strongly clear cookies
    try {
      await signOutAction()
    } catch (e) {
      // Redirect happens in action, but if it throws (e.g. network), force local nav
      router.refresh()
    }
  }

  const register = async (input: { email: string; password: string; firstName: string; lastName: string; phone?: string; block?: string; lot?: string; phase?: string }) => {
    try {
      setOpLoading(true)

      console.log("[auth] registering homeowner", input.email)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

      try {
        const res = await fetch('/api/auth/register-homeowner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        const data = await res.json()
        console.log("[auth] registration response", { status: res.status, data })

        if (!res.ok) {
          return { success: false, error: data.error || 'Registration failed' }
        }

        // Auto login after registration if successful/approved
        if (data.success) {
          console.log("[auth] registration success, attempting auto-login")
          const supabase = createBrowserSupabase()
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: input.email,
            password: input.password
          })

          if (loginError) {
            console.error("[auth] auto-login failed", loginError)
            return { success: true, error: 'Account created but auto-login failed. Please sign in.' }
          }

          console.log("[auth] auto-login success")
          router.refresh()
          return { success: true }
        }
        return { success: true }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          return { success: false, error: "Registration timed out. Please check your connection." }
        }
        throw e
      } finally {
        clearTimeout(timeoutId)
      }
    } catch (e: any) {
      console.error("[auth] register exception", e)
      return { success: false, error: e?.message || "Registration failed" }
    } finally {
      console.log("[auth] register finally - clearing opLoading")
      setOpLoading(false)
    }
  }

  return <AuthContext.Provider value={{ session, login, logout, register, isLoading: opLoading, isInitializing, homeownerProfile, registrationStatus, hasDocuments }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
