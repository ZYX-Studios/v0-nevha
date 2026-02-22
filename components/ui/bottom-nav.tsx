"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Bell, QrCode, Wallet, User, FileText, Phone } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  // Hide on auth, onboarding, admin, and dept pages
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dept")
  ) return null

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      isActive: pathname === "/"
    },
    {
      href: "/announcements",
      icon: Bell,
      label: "Updates",
      isActive: pathname.startsWith("/announcements")
    },
    {
      href: "/applications",
      icon: QrCode,
      label: "Services",
      isActive: pathname.startsWith("/applications") || pathname.startsWith("/report") || pathname.startsWith("/emergency"),
      highlight: true
    },
    {
      href: "/bills",
      icon: Wallet,
      label: "Bills",
      isActive: pathname.startsWith("/bills")
    },
    {
      href: "/profile",
      icon: User,
      label: "Profile",
      isActive: pathname.startsWith("/profile")
    }
  ]

  return (
    <nav className="fixed bottom-6 left-4 right-4 z-50 bg-white/90 backdrop-blur-2xl border border-white/20 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] rounded-full px-2 py-2 flex justify-between items-center max-w-md mx-auto">
      {navItems.map((item) => (
        <NavItem
          key={item.href}
          {...item}
        />
      ))}
    </nav>
  )
}

function NavItem({ icon: Icon, label, href, isActive, highlight }: any) {
  if (highlight) {
    return (
      <Link href={href} className="flex flex-col items-center justify-center -mt-8 relative z-20">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform border-[4px] border-[#F2F2F7] ${isActive ? 'bg-blue-600 shadow-blue-500/40' : 'bg-slate-900 shadow-slate-900/30'}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </Link>
    )
  }

  return (
    <Link href={href} className="flex-1 flex flex-col items-center gap-1 group py-2 relative z-10">
      <Icon className={`w-6 h-6 ${isActive ? 'text-blue-600 fill-blue-600/10' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`} />
      {label && (
        <span className={`text-[10px] font-bold tracking-wide ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
          {label}
        </span>
      )}
    </Link>
  )
}
