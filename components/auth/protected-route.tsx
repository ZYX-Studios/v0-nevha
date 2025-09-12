// Component to protect routes that require authentication

"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import type { User } from "@/lib/types"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: "admin" | "staff" | "homeowner"
  fallbackPath?: string
}

export function ProtectedRoute({ children, requiredRole, fallbackPath = "/auth" }: ProtectedRouteProps) {
  const { session } = useAuth()
  const isLoading = session.isLoading
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!session.isAuthenticated) {
        router.push(fallbackPath)
        return
      }

      if (requiredRole && session.user) {
        const hasRequiredRole = checkUserRole(session.user, requiredRole)
        if (!hasRequiredRole) {
          router.push("/dashboard") // Redirect to dashboard if insufficient permissions
          return
        }
      }
    }
  }, [session, isLoading, requiredRole, router, fallbackPath])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session.isAuthenticated) {
    return null // Will redirect
  }

  if (requiredRole && session.user && !checkUserRole(session.user, requiredRole)) {
    return null // Will redirect
  }

  return <>{children}</>
}

function checkUserRole(user: User, requiredRole: string): boolean {
  switch (requiredRole) {
    case "admin":
      return user.role === "admin"
    case "staff":
      return user.role === "admin" || user.role === "staff"
    case "homeowner":
      return user.role === "homeowner" || user.role === "admin" || user.role === "staff"
    default:
      return true
  }
}
