import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        // Debugging the loop:
        console.log("Onboarding Layout Auth Error:", error)
        // return redirect("/auth") // Original behavior
        return (
            <div className="flex h-screen w-full items-center justify-center p-10 flex-col gap-4">
                <h1 className="text-xl font-bold text-red-500">Server-Side Auth Failed</h1>
                <p>Error: {error?.message ?? "No User Found"}</p>
                <div className="bg-slate-100 p-4 rounded text-sm font-mono overflow-auto max-w-lg">
                    <p>Possible causes:</p>
                    <ul className="list-disc pl-5">
                        <li>Cookie missing or expired</li>
                        <li>Middleware not refreshing session</li>
                        <li>Browser/Client state out of sync</li>
                    </ul>
                </div>
                <a href="/auth" className="text-blue-500 hover:underline">Go to /auth manually</a>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#F2F2F7] font-sans selection:bg-blue-100 flex flex-col">
            {/* Simple Header */}
            <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 border-b border-white/20 px-6 py-4 flex items-center justify-center shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
                <span className="text-[17px] font-bold tracking-tight text-slate-900">NEVHA Onboarding</span>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6">
                {children}
            </main>
        </div>
    )
}
