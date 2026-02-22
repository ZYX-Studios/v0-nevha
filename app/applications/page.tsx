import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Car, Clock, CheckCircle2, XCircle, ChevronRight, Plus, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
    verified: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  }
  const s = map[status] ?? { label: status, className: 'bg-slate-100 text-slate-500' }
  return (
    <Badge variant="outline" className={`text-[11px] font-bold uppercase tracking-wide ${s.className}`}>
      {s.label}
    </Badge>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'approved' || status === 'verified') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-400" />
  return <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
}

export default async function ApplicationsPage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/auth')

  const homeownerRes = await supabase
    .from('homeowners')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const homeownerId = homeownerRes.data?.id ?? null

  // Fetch vehicle requests + pending payments in parallel
  const [vehicleRes, paymentRes] = await Promise.all([
    supabase
      .from('vehicle_requests')
      .select('id, vehicle_type, plate_number, sticker_price, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    homeownerId
      ? supabase
        .from('payments')
        .select('id, fee_type, fee_year, amount, status, created_at')
        .eq('homeowner_id', homeownerId)
        .in('status', ['pending', 'verified', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(10)
      : Promise.resolve({ data: [], error: null }),
  ])

  const vehicleRequests = vehicleRes.data ?? []
  const payments = paymentRes.data ?? []

  const hasAny = vehicleRequests.length > 0 || payments.length > 0

  const FEE_LABELS: Record<string, string> = {
    annual_dues: 'Annual Dues',
    car_sticker: 'Car Sticker',
    monthly_dues: 'Monthly Dues',
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-[17px] font-semibold text-slate-900">My Applications</h1>
        </div>
        <Link href="/vehicles">
          <Button size="sm" className="gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8">
            <Plus className="w-3.5 h-3.5" />
            Register Vehicle
          </Button>
        </Link>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">

        {/* Vehicle Requests Section */}
        <section>
          <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
            Vehicle Registrations
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            {vehicleRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <Car className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No vehicle requests yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  Register your vehicle to get a NEVHA car sticker.
                </p>
                <Link href="/vehicles" className="mt-3">
                  <Button size="sm" variant="outline" className="rounded-full text-xs gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    Register Vehicle
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {vehicleRequests.map((req) => (
                  <div key={req.id} className="px-4 py-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Car className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900 capitalize">
                          {req.vehicle_type}
                        </span>
                        <span className="font-mono text-xs text-slate-500 uppercase">
                          {req.plate_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Submitted {format(new Date(req.created_at), 'MMM dd, yyyy')}
                        {req.sticker_price && ` · ₱${Number(req.sticker_price).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={req.status} />
                      <StatusIcon status={req.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Payment Verifications Section */}
        {homeownerId && (
          <section>
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                Payment Submissions
              </h2>
              <Link href="/bills">
                <Button variant="ghost" size="sm" className="text-blue-600 text-[13px] font-semibold h-auto p-0 gap-1">
                  View Bills
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              {payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <DollarSign className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No recent payment submissions</p>
                  <p className="text-xs text-slate-400 mt-1">Go to Bills to make a payment.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <div key={p.id} className="px-4 py-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${p.status === 'verified' ? 'bg-emerald-50' :
                          p.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
                        }`}>
                        <DollarSign className={`w-4 h-4 ${p.status === 'verified' ? 'text-emerald-600' :
                            p.status === 'rejected' ? 'text-red-500' : 'text-amber-500'
                          }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900">
                          {FEE_LABELS[p.fee_type] ?? p.fee_type.replace(/_/g, ' ')}
                          <span className="text-slate-400 font-normal ml-1 text-xs">({p.fee_year})</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {format(new Date(p.created_at), 'MMM dd, yyyy')} · ₱{Number(p.amount).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={p.status} />
                        <StatusIcon status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* If totally new user prompt */}
        {!hasAny && !homeownerId && (
          <div className="text-center py-8 text-slate-400 text-sm">
            You don&apos;t have any active applications yet.
          </div>
        )}

      </main>
    </div>
  )
}
