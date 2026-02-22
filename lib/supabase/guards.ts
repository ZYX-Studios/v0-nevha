import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifySession, type DeptSession } from "@/lib/dept/session"

/**
 * Ensures a user is authenticated.
 * If not, redirects to /auth.
 */
export async function requireAuth() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        redirect("/auth")
    }

    return user
}

/**
 * Ensures a user is authenticated AND has an ADMIN or STAFF role.
 * If not authenticated → redirects to /auth.
 * If authenticated but not admin/staff → redirects to /.
 */
export async function requireAdmin() {
    const user = await requireAuth()

    const supabase = await createClient()
    const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (dbUser?.role !== "ADMIN" && dbUser?.role !== "STAFF") {
        redirect("/")
    }

    return user
}

/**
 * API Route Guard: Requires authenticated ADMIN or STAFF.
 * Returns a 401/403 NextResponse if unauthorized, or null if authorized.
 */
export async function requireAdminAPI() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    if (dbUser?.role !== "ADMIN" && dbUser?.role !== "STAFF") {
        return NextResponse.json({ error: "Forbidden: Insufficient privileges" }, { status: 403 })
    }

    return null
}

/**
 * API Route Guard: Requires any authenticated Supabase user.
 * Returns a 401 NextResponse if unauthorized, or null if authorized.
 */
export async function requireAuthAPI() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return null
}

/**
 * API Route Guard: Verifies the dept_session cookie (HMAC-SHA256, 7-day TTL).
 * Returns 401 if invalid/expired, or the parsed payload if valid.
 */
export async function requireDeptSessionAPI(): Promise<
    { error: NextResponse; payload: null } | { error: null; payload: DeptSession }
> {
    const cookieStore = await cookies()
    const token = cookieStore.get("dept_session")?.value

    if (!token) {
        return {
            error: NextResponse.json({ error: "Unauthorized: Missing department session" }, { status: 401 }),
            payload: null,
        }
    }

    const payload = verifySession(token)

    if (!payload) {
        return {
            error: NextResponse.json({ error: "Unauthorized: Invalid or expired department session" }, { status: 401 }),
            payload: null,
        }
    }

    return { error: null, payload }
}
