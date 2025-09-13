import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function POST(req: Request) {
  const res = NextResponse.json({ success: true })
  try {
    const { access_token, refresh_token } = (await req.json().catch(() => ({}))) as {
      access_token?: string | null
      refresh_token?: string | null
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // We don't need to read here for this endpoint
            return []
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
          },
        },
      },
    )

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return res
    } else {
      await supabase.auth.signOut()
      return res
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
