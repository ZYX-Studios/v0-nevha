// Admin dashboard — content only, nav shell provided by admin layout
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Announcement, Issue } from '@/lib/types'
import {
  Users, AlertCircle, MessageSquare, Car, DollarSign,
  CheckCircle, Clock, UserCheck, ClipboardList, Plus,
  TrendingUp, QrCode, Shield
} from 'lucide-react'

interface DashboardStats {
  totalHomeowners: number
  activeIssues: number
  publishedAnnouncements: number
  activeCarStickers: number
  adminUsers: number
  pendingPayments: number
  pendingVehicleRequests: number
  pendingRegistrations: number
  pendingNameChanges: number
  recentIssues: Issue[]
  recentAnnouncements: Announcement[]
}

const STAT_CARDS = (stats: DashboardStats) => [
  { label: 'Homeowners', value: stats.totalHomeowners, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', route: '/admin/homeowners' },
  { label: 'Active Issues', value: stats.activeIssues, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', route: '/admin/issues' },
  { label: 'Announcements', value: stats.publishedAnnouncements, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', route: '/admin/announcements' },
  { label: 'Car Stickers', value: stats.activeCarStickers, icon: Car, color: 'text-emerald-600', bg: 'bg-emerald-50', route: '/admin/homeowners' },
  { label: 'Admin Users', value: stats.adminUsers, icon: Shield, color: 'text-slate-600', bg: 'bg-slate-100', route: '/admin/users' },
]

const QUICK_ACTIONS = (stats: DashboardStats) => [
  { label: 'New Announcement', icon: Plus, route: '/admin/announcements/new', primary: true, badge: 0 },
  { label: 'Registrations', icon: ClipboardList, route: '/admin/registrations', primary: false, badge: stats.pendingRegistrations },
  { label: 'Vehicles', icon: Car, route: '/admin/vehicles', primary: false, badge: stats.pendingVehicleRequests },
  { label: 'Payments', icon: DollarSign, route: '/admin/payments', primary: false, badge: stats.pendingPayments },
  { label: 'Name Changes', icon: UserCheck, route: '/admin/profile-changes', primary: false, badge: stats.pendingNameChanges },
  { label: 'QR Codes', icon: QrCode, route: '/admin/qr-codes', primary: false, badge: 0 },
]

function StatCard({ stat, loading, router }: { stat: ReturnType<typeof STAT_CARDS>[0], loading: boolean, router: ReturnType<typeof useRouter> }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => !loading && router.push(stat.route)}
      className="cursor-pointer"
    >
      <Card className="border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-2.5 rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <TrendingUp className="h-4 w-4 text-slate-300" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mb-0.5">{loading ? '—' : stat.value}</p>
          <p className="text-xs font-medium text-slate-500">{stat.label}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function QuickAction({ action, router }: { action: ReturnType<typeof QUICK_ACTIONS>[0], router: ReturnType<typeof useRouter> }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => router.push(action.route)}
      className={`relative flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-2xl border text-sm font-semibold transition-all ${action.primary
          ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/25'
          : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
        }`}
    >
      <div className={`p-2 rounded-xl relative ${action.primary ? 'bg-white/20' : 'bg-slate-100'}`}>
        <action.icon className="h-5 w-5" />
        {action.badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {action.badge > 9 ? '9+' : action.badge}
          </span>
        )}
      </div>
      <span className="text-xs text-center leading-tight">{action.label}</span>
    </motion.button>
  )
}

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'resolved') return 'default'
  if (status === 'in_progress') return 'secondary'
  return 'outline'
}

function getPriorityVariant(priority: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (priority === 'urgent' || priority === 'P1') return 'destructive'
  if (priority === 'high' || priority === 'P2') return 'secondary'
  return 'outline'
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalHomeowners: 0, activeIssues: 0, publishedAnnouncements: 0,
    activeCarStickers: 0, adminUsers: 0, pendingPayments: 0,
    pendingVehicleRequests: 0, pendingRegistrations: 0, pendingNameChanges: 0,
    recentIssues: [], recentAnnouncements: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/stats', { cache: 'no-store' })
        if (!res.ok) throw new Error('Failed to fetch dashboard statistics')
        const data = await res.json()
        setStats({
          totalHomeowners: data.stats.totalHomeowners ?? 0,
          activeIssues: data.stats.activeIssues ?? 0,
          publishedAnnouncements: data.stats.publishedAnnouncements ?? 0,
          activeCarStickers: data.stats.activeCarStickers ?? 0,
          adminUsers: data.stats.adminUsers ?? 0,
          pendingPayments: data.stats.pendingPayments ?? 0,
          pendingVehicleRequests: data.stats.pendingVehicleRequests ?? 0,
          pendingRegistrations: data.stats.pendingRegistrations ?? 0,
          pendingNameChanges: data.stats.pendingNameChanges ?? 0,
          recentIssues: data.recentItems?.issues ?? [],
          recentAnnouncements: data.recentItems?.announcements ?? [],
        })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">NEVHA Community Management Overview</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Stats Grid */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {STAT_CARDS(stats).map((stat, i) => (
            <StatCard key={i} stat={stat} loading={loading} router={router} />
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {QUICK_ACTIONS(stats).map((action, i) => (
            <QuickAction key={i} action={action} router={router} />
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="grid lg:grid-cols-2 gap-6">
        {/* Recent Issues */}
        <Card className="border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Recent Issues</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/issues')} className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg h-7 px-2">
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Clock className="h-6 w-6 animate-pulse" />
              </div>
            ) : stats.recentIssues.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No recent issues</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentIssues.map((issue) => (
                  <div
                    key={issue.id}
                    onClick={() => router.push(`/admin/issues/${issue.id}`)}
                    className="flex items-start gap-3 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="mt-0.5">
                      {issue.status === 'resolved'
                        ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                        : issue.status === 'in_progress'
                          ? <Clock className="h-4 w-4 text-blue-500" />
                          : <AlertCircle className="h-4 w-4 text-orange-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{issue.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{issue.description}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge variant={getStatusVariant(issue.status)} className="text-[10px] px-1.5 py-0 rounded-full capitalize">
                          {issue.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant={getPriorityVariant(issue.priority)} className="text-[10px] px-1.5 py-0 rounded-full">
                          {issue.priority}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">Recent Announcements</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/announcements')} className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg h-7 px-2">
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Clock className="h-6 w-6 animate-pulse" />
              </div>
            ) : stats.recentAnnouncements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No recent announcements</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {stats.recentAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    onClick={() => router.push(`/admin/announcements/${ann.id}/edit`)}
                    className="flex items-start gap-3 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{ann.title}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{ann.content}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ann.isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                          {ann.isPublished ? 'Published' : 'Draft'}
                        </span>
                        <Badge variant={getPriorityVariant(ann.priority)} className="text-[10px] px-1.5 py-0 rounded-full">
                          {ann.priority}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
