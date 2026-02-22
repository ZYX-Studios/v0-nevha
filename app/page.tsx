"use client"

import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { useSwipeable } from "react-swipeable"
import {
    MessageSquare,
    ChevronRight,
    FileText,
    Phone,
    Shield,
    Home,
    Bell,
    Wallet,
    User,
    QrCode,
    Search
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/use-auth"

// NEVHA Premium Design System
// Colors: Primary Blue (#007AFF), Indigo Gradient (#6366f1), Background (#F2F2F7)
// Shadows: Apple-style diffuse shadows

export default function HomePage() {
    const { session, isLoading: authLoading } = useAuth()
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

    // Derive display name: session.user.firstName (from users table, loaded by useAuth) → email prefix → 'Neighbor'
    const displayName = session.user
        ? (session.user.firstName || session.user.email?.split('@')[0] || 'Neighbor')
        : 'Neighbor'

    return (
        <div className="min-h-screen bg-[#F2F2F7] pb-32 font-sans selection:bg-blue-100">
            {/* 1. Header (Sticky, Glassmorphic 20px Blur) */}
            <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 border-b border-white/20 px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity duration-500"></div>
                        <Image
                            src="/NEVHA logo.svg"
                            alt="NEVHA Logo"
                            width={42}
                            height={42}
                            className="w-[42px] h-[42px] rounded-xl relative z-10 shadow-sm"
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[17px] font-bold tracking-tight text-slate-900 leading-none">NEVHA</span>
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mt-0.5">Community</span>
                    </div>
                </div>
                {
                    authLoading ? (
                        <Skeleton className="h-8 w-20 rounded-full bg-slate-200/50" />
                    ) : (
                        <Link href={
                            !session.user ? "/auth" :
                                (session.user.role === 'admin' || session.user.role === 'staff') ? "/admin" :
                                    "/profile"
                        }>
                            <button className="px-4 py-1.5 rounded-full bg-white/50 border border-white/50 text-slate-600 text-xs font-bold hover:bg-white active:scale-95 transition-all shadow-sm flex items-center gap-2">
                                {session.user ? (
                                    <>
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        {(session.user.role === 'admin' || session.user.role === 'staff') ? "Admin" : "Profile"}
                                    </>
                                ) : (
                                    "Login"
                                )}
                            </button>
                        </Link>
                    )
                }
            </header >

            <main className="px-6 pt-8 max-w-md mx-auto w-full space-y-8">
                {/* 2. Hero Greeting */}
                <div className="relative">
                    <h1 className="text-[34px] font-bold text-slate-900 tracking-tight leading-tight">
                        {greeting},<br />
                        <span className="text-slate-400">
                            {authLoading
                                ? <span className="inline-block w-28 h-8 bg-slate-200/60 rounded-lg animate-pulse align-middle" />
                                : `${displayName}.`
                            }
                        </span>
                    </h1>
                </div>

                {/* 3. Action Grid (The Core) */}
                <section>
                    <div className="grid grid-cols-2 gap-4">
                        {/* Visitor Pass */}
                        <Link href="/applications" className="group">
                            <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#10b981] to-[#059669] p-5 text-white shadow-[0_10px_30px_-5px_rgba(16,185,129,0.2)] active:scale-[0.98] transition-transform h-full flex flex-col justify-between min-h-[160px]">
                                <div className="relative z-10">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-3">
                                        <QrCode className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-[17px] font-bold leading-tight">Visitor<br />Pass</h3>
                                </div>
                            </div>
                        </Link>

                        {/* Check Status */}
                        <Link href="/status" className="group">
                            <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#6366f1] to-[#4f46e5] p-5 text-white shadow-[0_10px_30px_-5px_rgba(99,102,241,0.2)] active:scale-[0.98] transition-transform h-full flex flex-col justify-between min-h-[160px]">
                                <div className="relative z-10">
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-3">
                                        <Search className="w-5 h-5 text-white" />
                                    </div>
                                    <h3 className="text-[17px] font-bold leading-tight">Check<br />Status</h3>
                                </div>
                            </div>
                        </Link>

                        {/* Report Concern */}
                        <Link href="/report">
                            <div className="bg-white p-5 rounded-[1.75rem] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] border border-slate-100 h-full flex flex-col justify-between min-h-[160px] active:scale-[0.98] transition-all hover:shadow-lg hover:shadow-slate-200/50">
                                <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 mb-2">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-[17px] font-bold text-slate-900 leading-tight">Report<br />Concern</h3>
                                </div>
                            </div>
                        </Link>

                        {/* Pay Bills (Standard Card) */}
                        <Link href="/bills">
                            <div className="bg-white p-5 rounded-[1.75rem] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.05)] border border-slate-100 h-full flex flex-col justify-between min-h-[160px] active:scale-[0.98] transition-all hover:shadow-lg hover:shadow-slate-200/50">
                                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-[17px] font-bold text-slate-900 leading-tight">Pay<br />Bills</h3>
                                </div>
                            </div>
                        </Link>
                    </div>
                </section>

                {/* 4. Community Feed (Carousel) */}
                <section>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-[19px] font-bold text-slate-900 tracking-tight">Latest News</h2>
                        <Link href="/announcements" className="text-[13px] font-bold text-blue-600 active:opacity-70 bg-blue-50 px-3 py-1 rounded-full">
                            View All
                        </Link>
                    </div>

                    <div {...swipeHandlers} className="relative">
                        <div className="bg-white rounded-[1.75rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden min-h-[200px] border border-slate-100/50">
                            {loading ? (
                                <div className="p-6 space-y-4">
                                    <Skeleton className="h-6 w-1/3 rounded-lg bg-slate-100" />
                                    <Skeleton className="h-4 w-full rounded-md bg-slate-100" />
                                    <Skeleton className="h-4 w-2/3 rounded-md bg-slate-100" />
                                </div>
                            ) : announcements.length > 0 ? (
                                <div className="p-7 relative h-full flex flex-col justify-between">
                                    <AnimatePresence mode="wait">
                                        {announcements[currentSlide] && (
                                            <motion.div
                                                key={currentSlide}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide ${announcements[currentSlide].priority === "high"
                                                        ? "bg-red-50 text-red-500 ring-1 ring-red-100"
                                                        : "bg-blue-50 text-blue-600 ring-1 ring-blue-100"
                                                        }`}>
                                                        {announcements[currentSlide].priority === "high" ? "Urgent Update" : "Notice"}
                                                    </div>
                                                    <span className="text-[12px] font-semibold text-slate-400">
                                                        {new Date(announcements[currentSlide].publishDate || announcements[currentSlide].createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>

                                                <h3 className="text-[21px] font-bold text-slate-900 mb-3 leading-snug">
                                                    {announcements[currentSlide].title}
                                                </h3>
                                                <p className="text-[15px] text-slate-500 leading-relaxed line-clamp-2">
                                                    {announcements[currentSlide].content}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Pagination Dots */}
                                    <div className="flex gap-2 mt-6 justify-center">
                                        {announcements.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? "w-6 bg-slate-900" : "w-1.5 bg-slate-200"}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 text-center h-[200px]">
                                    <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <MessageSquare className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-slate-400 text-sm font-medium">All caught up!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main >

        </div >
    )
}
