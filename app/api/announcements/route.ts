import { NextResponse } from "next/server"
import { getAnnouncements } from "@/lib/data/announcements"

export async function GET() {
  try {
    const items = await getAnnouncements()
    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
