"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Home, FileText, Phone } from "lucide-react"

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
      isActive: pathname === "/"
    },
    {
      href: "/report",
      icon: FileText,
      label: "Report",
      isActive: pathname === "/report" || pathname.startsWith("/report")
    },
    {
      href: "/emergency",
      icon: Phone,
      label: "Emergency",
      isActive: pathname === "/emergency"
    }
  ]

  return (
    <>
      <div className="h-28" /> {/* Spacer */}

      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl backdrop-saturate-150 border-t border-slate-200/60 pb-safe-area-inset-bottom"
      >
        <div className="flex justify-around items-center px-4 pt-3 pb-4">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex-1 flex flex-col items-center justify-center group"
              >
                <div className="relative p-1.5 mb-1">
                  {item.isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-blue-100 rounded-xl"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className={`relative z-10 w-6 h-6 transition-colors duration-200 ${item.isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                    }`} />
                </div>
                <span className={`text-[10px] font-medium transition-colors duration-200 ${item.isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </motion.nav>
    </>
  )
}
