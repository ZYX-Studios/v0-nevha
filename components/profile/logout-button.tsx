"use client"

import { useAuth } from "@/hooks/use-auth"

export function LogoutButton() {
    const { logout } = useAuth()

    return (
        <div className="mt-6 bg-white rounded-xl overflow-hidden border border-slate-200/60 shadow-sm">
            <button
                onClick={() => logout()}
                className="w-full p-4 flex items-center justify-center text-red-600 font-semibold hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
                Log Out
            </button>
        </div>
    )
}
