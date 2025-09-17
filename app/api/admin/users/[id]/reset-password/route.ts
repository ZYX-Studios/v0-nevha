import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server missing Supabase configuration" },
        { status: 500 }
      )
    }

    // Use service role client for admin operations
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get user email from our users table
    const { data: userData, error: userError } = await adminClient
      .from("users")
      .select("email")
      .eq("id", id)
      .single()

    if (userError) {
      if (userError.code === "PGRST116") {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    // Send password reset email
    const { error: resetError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: userData.email,
    })

    if (resetError) {
      return NextResponse.json(
        { error: resetError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Password reset email sent to ${userData.email}`,
    })
  } catch (e: any) {
    console.error("Reset password error:", e)
    return NextResponse.json(
      { error: e?.message || "Failed to reset password" },
      { status: 500 }
    )
  }
}
