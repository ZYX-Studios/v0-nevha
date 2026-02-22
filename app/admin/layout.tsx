import React from 'react'
import { requireAdmin } from '@/lib/supabase/guards'
import { AdminShell } from '@/components/admin/admin-shell'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Server-side auth guard — redirects if not authenticated or not admin/staff
    await requireAdmin()

    return <AdminShell>{children}</AdminShell>
}
