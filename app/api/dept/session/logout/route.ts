import { NextResponse } from "next/server"
import { COOKIE_NAME } from "@/lib/dept/session"

export async function POST() {
  const res = NextResponse.json({ ok: true }, { status: 200 })
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })
  return res
}
