"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export async function signOutAction() {
    const supabase = await createClient()

    // 1. Attempt standard signOut
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await supabase.auth.signOut()
    }

    // 2. Aggressively manual clear cookies to ensure no persistence
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()

    // Find supabase cookies (usually starts with sb-)
    allCookies.forEach(cookie => {
        if (cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token")) {
            cookieStore.delete({ name: cookie.name, path: '/' })
            cookieStore.delete(cookie.name) // Fallback for default path
        }
    })

    // 3. Redirect
    return redirect("/auth")
}
