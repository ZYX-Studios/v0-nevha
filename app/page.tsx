"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  Phone,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  Shield,
  Sun,
  Cloud,
  CloudRain,
  Moon,
  Wind
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { BottomNav } from "@/components/ui/bottom-nav"
import { useState, useEffect } from "react"
import { useSwipeable } from "react-swipeable"

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState("")

  // Dynamic greeting based on time
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good Morning")
    else if (hour < 18) setGreeting("Good Afternoon")
    else setGreeting("Good Evening")
  }, [])

  // Load announcements on mount
  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const res = await fetch("/api/announcements", { cache: "no-store" })
        const json = await res.json()
        const items = (json?.items || [])
        setAnnouncements(items)
      } catch (e) {
        setAnnouncements([])
      } finally {
        setLoading(false)
      }
    }
    loadAnnouncements()
  }, [])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % Math.max(1, announcements.length))
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + Math.max(1, announcements.length)) % Math.max(1, announcements.length))
  }

  const swipeHandlers = useSwipeable({
    onSwipedLeft: nextSlide,
    onSwipedRight: prevSlide,
    trackMouse: true
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* Safe Area Top */}
      <div className="h-safe-area-inset-top bg-white/80 backdrop-blur-md sticky top-0 z-50" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 py-4 bg-white/80 backdrop-blur-xl backdrop-saturate-150 border-b border-blue-100/50 sticky top-0 z-40"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Image
                src="/NEVHA logo.svg"
                alt="NEVHA Logo"
                width={42}
                height={42}
                className="w-[42px] h-[42px] drop-shadow-sm"
              />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">Northfields Executive</h1>
              <p className="text-[11px] text-slate-500 font-medium tracking-wide uppercase">Village HOA</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/admin"
              className="text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
            >
              Admin
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="px-5 py-6 space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="rounded-2xl border-0 shadow-xl shadow-blue-900/5 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Image
                src="/NEVHA logo.svg"
                alt="Background Logo"
                width={120}
                height={120}
                className="w-32 h-32 rotate-12"
              />
            </div>

            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 text-blue-100 mb-1">
                    <Sun className="w-4 h-4" />
                    <span className="text-sm font-medium">Sunny, 28°C</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2 leading-tight">
                    {greeting || "Welcome"}! 👋
                  </h2>
                  <p className="text-blue-50 text-sm max-w-[200px] leading-relaxed opacity-90">
                    Stay updated with the latest community news and events.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Community Announcements */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-lg font-bold text-slate-900">Latest Updates</h3>
            <Link href="/announcements" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              View All
            </Link>
          </div>

          <div {...swipeHandlers} className="relative group">
            <Card className="rounded-2xl border border-blue-100/60 shadow-lg shadow-slate-200/50 bg-white/90 backdrop-blur-xl overflow-hidden min-h-[200px]">
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-4">
                    <div className="flex space-x-3">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-20 w-full rounded-xl" />
                  </div>
                ) : announcements.length > 0 ? (
                  <div className="relative">
                    {/* Content */}
                    <AnimatePresence mode="wait">
                      {announcements[currentSlide] && (
                        <motion.div
                          key={currentSlide}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.3 }}
                          className="p-6"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className={`p-3 rounded-xl shadow-sm ${announcements[currentSlide].priority === "high"
                                ? "bg-red-50 text-red-600"
                                : "bg-blue-50 text-blue-600"
                              }`}>
                              {announcements[currentSlide].priority === "high" ? (
                                <AlertTriangle className="w-6 h-6" />
                              ) : (
                                <MessageSquare className="w-6 h-6" />
                              )}
                            </div>
                            <div className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                              {new Date(announcements[currentSlide].publishDate || announcements[currentSlide].createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <h4 className="text-lg font-bold text-slate-900 mb-2 line-clamp-1">
                            {announcements[currentSlide].title}
                          </h4>
                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-4">
                            {announcements[currentSlide].content}
                          </p>

                          {announcements[currentSlide].priority === "high" && (
                            <div className="inline-flex items-center space-x-1.5 bg-red-50 border border-red-100 px-2.5 py-1 rounded-md text-red-700 text-xs font-semibold">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Important Notice</span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Pagination Dots */}
                    <div className="absolute bottom-4 right-6 flex space-x-1.5">
                      {announcements.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide
                              ? "w-4 bg-blue-600"
                              : "w-1.5 bg-slate-200"
                            }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-center p-6 bg-slate-50/50">
                    <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
                    <p className="text-sm font-medium text-slate-900">No updates yet</p>
                    <p className="text-xs text-slate-500">Check back later for community news</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <div className="mb-3 px-1">
            <h3 className="text-lg font-bold text-slate-900">Services</h3>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4"
          >
            <QuickActionCard
              href="/report"
              icon={FileText}
              title="Report a Concern"
              description="Submit maintenance requests"
              color="orange"
            />

            <QuickActionCard
              href="/emergency"
              icon={Phone}
              title="Emergency Hotline"
              description="24/7 security & medical contacts"
              color="red"
            />

            <QuickActionCard
              href="/applications"
              icon={Shield}
              title="Applications"
              description="Vehicle stickers, IDs & permits"
              color="blue"
            />
          </motion.div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}

function QuickActionCard({ href, icon: Icon, title, description, color }: any) {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    orange: "bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white",
    red: "bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white"
  }

  return (
    <Link href={href}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 10 },
          show: { opacity: 1, y: 0 }
        }}
        whileTap={{ scale: 0.98 }}
        className="group relative bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl transition-colors duration-300 ${colorStyles[color as keyof typeof colorStyles]}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 group-hover:text-slate-700 transition-colors">{title}</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{description}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </motion.div>
    </Link>
  )
}
