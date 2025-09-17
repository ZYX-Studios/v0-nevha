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
      isActive: pathname === "/report"
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
      {/* Bottom Navigation - Light & Accessible Design */}
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 z-50"
      >
        <div className="flex justify-around items-center py-4 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className="flex flex-col items-center min-w-[70px] min-h-[70px] justify-center"
              >
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 ${
                    item.isActive 
                      ? "bg-blue-500 shadow-lg" 
                      : "bg-gray-100 border border-gray-200"
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      item.isActive ? "text-white" : "text-gray-600"
                    }`} />
                  </div>
                  <span className={`text-sm ${
                    item.isActive 
                      ? "text-gray-900 font-semibold" 
                      : "text-gray-600 font-medium"
                  }`}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </motion.nav>

      {/* Safe Area Bottom */}
      <div className="h-28" />
    </>
  )
}
