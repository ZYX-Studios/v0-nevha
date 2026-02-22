'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'
import {
    LayoutDashboard, Users, ClipboardList, ShieldCheck,
    Megaphone, AlertCircle, QrCode, UserCheck, Menu, X,
    LogOut, ChevronRight, Shield, Building2, Settings, Tag, DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface NavItem {
    label: string
    href: string
    icon: React.ElementType
    badgeKey?: string
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Homeowners', href: '/admin/homeowners', icon: Users },
    { label: 'Verifications', href: '/admin/verifications', icon: ShieldCheck, badgeKey: 'pendingVerifications' },
    { label: 'Issues', href: '/admin/issues', icon: AlertCircle },
    { label: 'Stickers', href: '/admin/stickers', icon: Tag },
    { label: 'Payments', href: '/admin/payments', icon: DollarSign },
    { label: 'Departments', href: '/admin/departments', icon: Building2 },
    { label: 'Announcements', href: '/admin/announcements', icon: Megaphone },
    { label: 'Payment Settings', href: '/admin/qr-codes', icon: Settings },
    { label: 'Users', href: '/admin/users', icon: Shield },
]

interface PendingCounts {
    pendingRegistrations: number
    pendingVerifications: number
    pendingNameChanges: number
}

function NavLink({ item, counts, collapsed, onClick }: {
    item: NavItem
    counts: PendingCounts
    collapsed: boolean
    onClick?: () => void
}) {
    const pathname = usePathname()
    // Exact match for dashboard, prefix match for others
    const active = item.href === '/admin'
        ? pathname === '/admin'
        : pathname.startsWith(item.href)
    const badge = item.badgeKey ? (counts as any)[item.badgeKey] : 0

    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative',
                active
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
        >
            <item.icon className={cn('w-5 h-5 shrink-0', active ? 'text-white' : 'text-slate-500 group-hover:text-slate-700')} />
            {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
            )}
            {badge > 0 && (
                <span className={cn(
                    'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold',
                    active ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
                )}>
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </Link>
    )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(false)
    const [counts, setCounts] = useState<PendingCounts>({
        pendingRegistrations: 0,
        // pendingVerifications here includes name changes for the combined badge
        pendingVerifications: 0,
        pendingNameChanges: 0,
    })
    const { session, logout } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    // Close mobile sidebar on route change
    useEffect(() => { setSidebarOpen(false) }, [pathname])

    // Fetch pending counts on mount, pathname change, or explicit refresh event
    const fetchCounts = async () => {
        try {
            const res = await window.fetch('/api/admin/badge-counts', { cache: 'no-store' })
            if (!res.ok) return
            const data = await res.json()
            setCounts({
                pendingRegistrations: data.pendingRegistrations ?? 0,
                pendingVerifications: (data.pendingVerifications ?? 0) + (data.pendingNameChanges ?? 0),
                pendingNameChanges: data.pendingNameChanges ?? 0,
            })
        } catch { /* silent */ }
    }

    useEffect(() => { fetchCounts() }, [pathname])

    // Listen for explicit refresh requests dispatched by admin pages after approve/reject
    useEffect(() => {
        const handler = () => void fetchCounts()
        window.addEventListener('admin-counts-refresh', handler)
        return () => window.removeEventListener('admin-counts-refresh', handler)
    }, [])

    const totalPending = counts.pendingVerifications

    const handleLogout = () => {
        try { void logout() } catch { }
        if (typeof window !== 'undefined') window.location.replace('/auth?logout=1')
        else router.replace('/auth?logout=1')
    }

    const adminName = session?.user?.email?.split('@')[0] ?? 'Admin'
    const adminInitials = adminName.slice(0, 2).toUpperCase()

    // Sidebar inner content (shared between desktop + mobile drawer)
    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="flex flex-col h-full">
            {/* Brand */}
            <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-slate-100', collapsed && !isMobile && 'justify-center px-2')}>
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md shrink-0">
                    <img src="/NEVHA logo.svg" alt="NEVHA" className="w-6 h-6 brightness-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
                {(!collapsed || isMobile) && (
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-none">NEVHA</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-none">Admin Portal</p>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV_ITEMS.map(item => (
                    <NavLink
                        key={item.href}
                        item={item}
                        counts={counts}
                        collapsed={collapsed && !isMobile}
                        onClick={isMobile ? () => setSidebarOpen(false) : undefined}
                    />
                ))}
            </nav>

            {/* User footer */}
            <div className={cn('p-3 border-t border-slate-100', collapsed && !isMobile && 'flex justify-center')}>
                {collapsed && !isMobile ? (
                    <button onClick={handleLogout} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors" title="Logout">
                        <LogOut className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {adminInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate capitalize">{adminName}</p>
                            <p className="text-[10px] text-slate-500 truncate">{session?.user?.email}</p>
                        </div>
                        <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 transition-colors" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Desktop Sidebar */}
            <aside className={cn(
                'hidden lg:flex flex-col bg-white border-r border-slate-200 shrink-0 transition-all duration-300',
                collapsed ? 'w-[68px]' : 'w-[220px]'
            )}>
                <SidebarContent />
                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className="absolute top-16 -right-3 w-6 h-6 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center hover:bg-slate-50 transition-colors hidden lg:flex"
                    style={{ position: 'fixed', left: collapsed ? 53 : 205, zIndex: 50 }}
                >
                    <ChevronRight className={cn('w-3 h-3 text-slate-500 transition-transform', collapsed ? '' : 'rotate-180')} />
                </button>
            </aside>

            {/* Mobile Sidebar Drawer */}
            <AnimatePresence>
                {sidebarOpen && (
                    <>
                        <motion.div
                            key="backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                        <motion.aside
                            key="drawer"
                            initial={{ x: -260 }}
                            animate={{ x: 0 }}
                            exit={{ x: -260 }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-slate-200 z-50 flex flex-col lg:hidden"
                        >
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                            <SidebarContent isMobile />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main content area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile top bar */}
                <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                        <Menu className="w-5 h-5 text-slate-700" />
                    </button>
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                            <img src="/NEVHA logo.svg" alt="" className="w-4 h-4 brightness-200" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        </div>
                        <span className="text-sm font-bold text-slate-900">NEVHA Admin</span>
                    </div>
                    {totalPending > 0 && (
                        <span className="flex items-center justify-center min-w-[22px] h-5 px-1.5 bg-red-500 text-white rounded-full text-[11px] font-bold">
                            {totalPending > 99 ? '99+' : totalPending}
                        </span>
                    )}
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
