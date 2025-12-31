"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  Phone,
  FileText,
  Shield,
  Sun,
  Sparkles,
  TrendingUp,
  Users
} from "lucide-react"
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion"
import { BottomNav } from "@/components/ui/bottom-nav"
import { useState, useEffect, useRef } from "react"
import { useSwipeable } from "react-swipeable"

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState("")
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 300], [0, -50])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center justify-between max-w-7xl mx-auto px-8 py-6">
        <div className="flex items-center gap-3">
          <Image
            src="/NEVHA logo.svg"
            alt="NEVHA Logo"
            width={48}
            height={48}
            className="w-12 h-12"
          />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Northfields Executive</h1>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Village HOA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {[
            { href: "/", label: "Home" },
            { href: "/report", label: "Report" },
            { href: "/emergency", label: "Emergency" }
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-4 py-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="ml-4 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            Admin
          </Link>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/NEVHA logo.svg"
              alt="NEVHA Logo"
              width={42}
              height={42}
              className="w-[42px] h-[42px]"
            />
            <div>
              <h1 className="text-base font-bold text-slate-900">Northfields Executive</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Village HOA</p>
            </div>
          </div>
          <Link
            href="/admin"
            className="text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-md hover:bg-blue-50"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Premium Hero Section */}
      <motion.div
        ref={heroRef}
        style={{ y: heroY }}
        className="relative overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800">
          {/* Floating Orbs */}
          <div className="absolute top-20 left-10 w-64 h-64 bg-blue-400/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl animate-glow" />

          {/* Grid Pattern Overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            {/* Glass Card */}
            <div className="glass rounded-3xl p-8 lg:p-12 shadow-2xl shadow-black/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Sun className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">Sunny, 28°C</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-white/90">12 neighbors online</span>
                </div>
              </div>

              <h1 className="text-4xl lg:text-6xl font-bold text-white mb-4 tracking-tight leading-tight">
                {greeting}, <br className="hidden lg:block" />
                <span className="text-gradient inline-block mt-2">Neighbor</span>! 👋
              </h1>

              <p className="text-lg lg:text-xl text-white/80 leading-relaxed max-w-xl">
                Welcome to your NEVHA community hub. Stay connected, informed, and engaged with everything happening in Northfields Executive Village.
              </p>

              <div className="flex flex-wrap gap-4 mt-8">
                <Link href="/report">
                  <button className="group px-6 py-3 bg-white/90 hover:bg-white text-blue-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    Report Issue
                  </button>
                </Link>
                <Link href="/announcements">
                  <button className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300">
                    View Updates
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12 lg:py-16">
        {/* Two Column Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Latest Updates */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Latest Updates</h2>
                <p className="text-slate-600 mt-1">Community announcements</p>
              </div>
              <Link href="/announcements" className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                View All
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div {...swipeHandlers} className="relative group">
              <Card className="rounded-2xl border border-slate-200/60 shadow-premium-lg bg-white overflow-hidden min-h-[280px] hover:shadow-2xl transition-shadow duration-500">
                <CardContent className="p-0">
                  {loading ? (
                    <div className="p-8 space-y-4">
                      <div className="flex space-x-4">
                        <Skeleton className="h-14 w-14 rounded-xl" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                      <Skeleton className="h-24 w-full rounded-xl" />
                    </div>
                  ) : announcements.length > 0 ? (
                    <div className="relative">
                      <AnimatePresence mode="wait">
                        {announcements[currentSlide] && (
                          <motion.div
                            key={currentSlide}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.4 }}
                            className="p-8"
                          >
                            <div className="flex items-start justify-between mb-6">
                              <div className={`p-4 rounded-xl ${announcements[currentSlide].priority === "high"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-blue-50 text-blue-600"
                                }`}>
                                {announcements[currentSlide].priority === "high" ? (
                                  <AlertTriangle className="w-7 h-7" />
                                ) : (
                                  <MessageSquare className="w-7 h-7" />
                                )}
                              </div>
                              <div className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                                {new Date(announcements[currentSlide].publishDate || announcements[currentSlide].createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2">
                              {announcements[currentSlide].title}
                            </h3>
                            <p className="text-base text-slate-600 leading-relaxed line-clamp-4 mb-6">
                              {announcements[currentSlide].content}
                            </p>

                            {announcements[currentSlide].priority === "high" && (
                              <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-red-700 text-sm font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Important Notice</span>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Pagination */}
                      <div className="absolute bottom-6 right-8 flex gap-2">
                        {announcements.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide
                                ? "w-8 bg-blue-600"
                                : "w-2 bg-slate-300 hover:bg-slate-400"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[280px] text-center p-8">
                      <div className="p-4 bg-slate-100 rounded-2xl mb-4">
                        <MessageSquare className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-base font-semibold text-slate-900">No updates yet</p>
                      <p className="text-sm text-slate-500 mt-1">Check back later for community news</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Community Stats */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Community Pulse</h2>
              <p className="text-slate-600 mt-1">This week's highlights</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={Users}
                value="247"
                label="Active Members"
                color="blue"
              />
              <StatCard
                icon={AlertTriangle}
                value="3"
                label="Open Issues"
                color="orange"
              />
              <StatCard
                icon={TrendingUp}
                value="94%"
                label="Resolution Rate"
                color="green"
              />
              <StatCard
                icon={Sparkles}
                value="12"
                label="Events This Month"
                color="purple"
              />
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="mt-16">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">Essential Services</h2>
            <p className="text-slate-600 mt-2">Quick access to everything you need</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PremiumServiceCard
              href="/report"
              icon={FileText}
              title="Report a Concern"
              description="Submit maintenance requests and track progress"
              color="orange"
            />

            <PremiumServiceCard
              href="/emergency"
              icon={Phone}
              title="Emergency Hotline"
              description="24/7 security and medical emergency contacts"
              color="red"
            />

            <PremiumServiceCard
              href="/applications"
              icon={Shield}
              title="Applications"
              description="Vehicle stickers, IDs, permits and more"
              color="blue"
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  )
}

function PremiumServiceCard({ href, icon: Icon, title, description, color }: any) {
  const colorStyles = {
    blue: {
      gradient: "from-blue-500 to-cyan-500",
      glow: "group-hover:shadow-glow-blue",
      ring: "ring-blue-200/50"
    },
    orange: {
      gradient: "from-orange-500 to-amber-500",
      glow: "group-hover:shadow-glow-blue",
      ring: "ring-orange-200/50"
    },
    red: {
      gradient: "from-red-500 to-rose-500",
      glow: "group-hover:shadow-glow-purple",
      ring: "ring-red-200/50"
    }
  }

  const style = colorStyles[color as keyof typeof colorStyles]

  return (
    <Link href={href}>
      <div className="group relative">
        {/* Glow Effect */}
        <div className={`absolute -inset-1 bg-gradient-to-r ${style.gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500`} />

        {/* Card */}
        <div className={`relative bg-white ring-1 ${style.ring} rounded-2xl p-6 shadow-premium hover:shadow-premium-lg ${style.glow} transition-all duration-300 hover:-translate-y-1`}>
          <div className="flex items-start gap-4">
            <div className={`p-4 bg-gradient-to-br ${style.gradient} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function StatCard({ icon: Icon, value, label, color }: any) {
  const colorStyles = {
    blue: "from-blue-500 to-cyan-500",
    green: "from-green-500 to-emerald-500",
    orange: "from-orange-500 to-amber-500",
    purple: "from-purple-500 to-pink-500"
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-premium hover:shadow-premium-lg transition-all duration-300 hover:-translate-y-0.5">
      <div className={`p-3 bg-gradient-to-br ${colorStyles[color as keyof typeof colorStyles]} rounded-lg w-fit mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-sm text-slate-600 font-medium">{label}</div>
    </div>
  )
}
