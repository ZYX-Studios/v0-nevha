import { NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { COOKIE_NAME, signSession } from "@/lib/dept/session"
import bcrypt from "bcryptjs"
import { getClientIp, rateLimitPass } from "@/lib/rate-limit"

const BodySchema = z.object({
  department_id: z.string().uuid(),
  password: z.string().min(1),
})

export async function POST(req: Request) {
  try {
    // Basic IP rate limiting: 10 attempts per 5 minutes
    const ip = getClientIp(req)
    const rl = rateLimitPass(`dept-login:${ip}`, 5 * 60 * 1000, 10)
    if (!rl.allowed) {
      const res = NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 })
      res.headers.set("Retry-After", Math.ceil(rl.resetMs / 1000).toString())
      return res
    }

    const json = await req.json().catch(() => ({}))
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const supabase = createAdminClient()
    const { data: dep, error } = await supabase
      .from("departments")
      .select("id,name,is_active,portal_password_hash,portal_password_updated_at")
      .eq("id", parsed.data.department_id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!dep) return NextResponse.json({ error: "Department not found" }, { status: 404 })
    if (dep.is_active === false) return NextResponse.json({ error: "Department is inactive" }, { status: 403 })
    if (!dep.portal_password_hash) return NextResponse.json({ error: "Portal not enabled for this department" }, { status: 400 })

    const ok = bcrypt.compareSync(parsed.data.password, dep.portal_password_hash as string)
    if (!ok) return NextResponse.json({ error: "Invalid password" }, { status: 401 })

    const token = signSession({
      dept_id: dep.id as string,
      dept_name: dep.name as string,
      iat: Math.floor(Date.now() / 1000),
      ver: (dep.portal_password_updated_at as string | null) ?? null,
    })

    // Stamp last_login_at — fire and forget, don't block the response
    supabase
      .from("departments")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", dep.id)
      .then(() => { }) // intentionally ignored

    const res = NextResponse.json({ ok: true, department: { id: dep.id, name: dep.name } }, { status: 200 })
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
