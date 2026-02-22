import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdminAPI } from "@/lib/supabase/guards"
// Use the same server-admin client creation logic if possible, 
// or create one directly to be sure what env vars are used.
// We'll try to read env vars directly to see what the process sees.

export async function GET() {
  const authError = await requireAdminAPI()
  if (authError) return authError

    try {
    const denied = await requireAdminAPI()
    if (denied) return denied
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        let supabase
        let connectionStatus = "Not initialized"
        let issues = []
        let announcements = []
        let error = null

        if (supabaseUrl && serviceRoleKey) {
            supabase = createClient(supabaseUrl, serviceRoleKey)
            connectionStatus = "Client created"

            const issuesRes = await supabase.from("issues").select("*").limit(5)
            if (issuesRes.error) throw issuesRes.error
            issues = issuesRes.data

            const announcementsRes = await supabase.from("announcements").select("*").limit(5)
            if (announcementsRes.error) throw announcementsRes.error
            announcements = announcementsRes.data

            connectionStatus = "Connected and queried"
        } else {
            connectionStatus = "Missing Env Vars"
        }

        // Mask the URL for safety but show enough to identify
        const maskedUrl = supabaseUrl
            ? `${supabaseUrl.substring(0, 8)}...${supabaseUrl.substring(supabaseUrl.length - 10)}`
            : "UNDEFINED"

        return NextResponse.json({
            env: {
                NEXT_PUBLIC_SUPABASE_URL: maskedUrl,
            },
            connectionStatus,
            data: {
                issues,
                announcements
            }
        })
    } catch (e: any) {
        return NextResponse.json({
            error: e.message,
            stack: e.stack
        }, { status: 500 })
    }
}
