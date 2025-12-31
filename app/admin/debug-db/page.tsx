"use strict";
"use client";

import { useState, useEffect } from "react"

export default function DebugPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/admin/debug-db-api")
            .then(res => res.json())
            .then(setData)
            .catch(err => setData({ error: err.message }))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="p-8">Loading debug info...</div>

    return (
        <div className="p-8 space-y-8 bg-white min-h-screen text-slate-900">
            <h1 className="text-2xl font-bold">Database Debugger</h1>

            <div className="bg-slate-100 p-4 rounded border">
                <h2 className="font-semibold mb-2">Environment</h2>
                <pre className="text-sm overflow-auto">
                    {JSON.stringify(data?.env, null, 2)}
                </pre>
                <div className="mt-2 font-mono text-sm">
                    Status: {data?.connectionStatus}
                </div>
            </div>

            <div className="bg-slate-100 p-4 rounded border">
                <h2 className="font-semibold mb-2">Recent Issues (Raw DB)</h2>
                <pre className="text-xs overflow-auto max-h-96">
                    {JSON.stringify(data?.data?.issues, null, 2)}
                </pre>
            </div>

            <div className="bg-slate-100 p-4 rounded border">
                <h2 className="font-semibold mb-2">Recent Announcements (Raw DB)</h2>
                <pre className="text-xs overflow-auto max-h-96">
                    {JSON.stringify(data?.data?.announcements, null, 2)}
                </pre>
            </div>

            {data?.error && (
                <div className="bg-red-100 text-red-800 p-4 rounded">
                    Error: {JSON.stringify(data.error)}
                </div>
            )}
        </div>
    )
}
