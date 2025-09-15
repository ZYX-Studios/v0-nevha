import { cookies } from "next/headers"
import { verifySession, type DeptSession, COOKIE_NAME } from "./session"
import { createAdminClient } from "@/lib/supabase/server-admin"

export type DeptContext = {
  id: string
  name: string
  version: string | null
}

export async function getDeptContext(): Promise<DeptContext | null> {
  try {
    // Use next/headers in route handlers
    const cookieStore = cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    const payload: DeptSession | null = verifySession(token)
    if (!payload) return null

    const supabase = createAdminClient()
    const { data: dep, error } = await supabase
      .from("departments")
      .select("id,name,is_active,portal_password_updated_at")
      .eq("id", payload.dept_id)
      .maybeSingle()

    if (error || !dep) return null
    if (dep.is_active === false) return null

    const dbVer = (dep.portal_password_updated_at as string | null) ?? null
    if (dbVer && payload.ver && dbVer !== payload.ver) {
      // password rotated; invalidate session
      return null
    }

    return { id: dep.id as string, name: dep.name as string, version: dbVer }
  } catch {
    return null
  }
}
