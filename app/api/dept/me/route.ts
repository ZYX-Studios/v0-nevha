import { NextResponse } from "next/server"
import { getDeptContext } from "@/lib/dept/auth"
import { requireDeptSessionAPI } from "@/lib/supabase/guards"

export async function GET() {
  const authError = await requireDeptSessionAPI()
  if (authError) return authError

  try {
    const ctx = await getDeptContext()
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ department: { id: ctx.id, name: ctx.name } }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
