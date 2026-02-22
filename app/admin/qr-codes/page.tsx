import { createAdminClient } from '@/lib/supabase/server-admin'
import { QRCodeList } from '@/components/admin/qr-code-list'
import { DuesConfigForm } from '@/components/admin/dues-config-form'
import { getActiveDuesConfig } from '@/app/admin/qr-codes/actions'
import { Settings } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentSettingsPage() {
    const supabase = createAdminClient()

    const [qrCodesResult, duesConfig] = await Promise.all([
        supabase.from('payment_qr_codes').select('*').order('created_at', { ascending: false }),
        getActiveDuesConfig(),
    ])

    const { data: qrCodes, error } = qrCodesResult

    if (error) {
        console.error('Error fetching QR codes:', error)
        return <div className="p-8 text-red-500">Error loading payment settings: {error.message}</div>
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shadow shadow-slate-800/30 shrink-0">
                    <Settings className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Payment Settings</h1>
                    <p className="text-sm text-slate-500">Configure dues pricing and manage QR payment methods.</p>
                </div>
            </div>

            {/* Section 1: Dues Configuration */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                    Dues &amp; Pricing
                </h2>
                <DuesConfigForm current={duesConfig} />
            </section>

            {/* Divider */}
            <hr className="border-slate-100" />

            {/* Section 2: QR Code Payment Methods */}
            <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                    Payment Methods (QR Codes)
                </h2>
                <QRCodeList initialData={qrCodes || []} />
            </section>
        </div>
    )
}
