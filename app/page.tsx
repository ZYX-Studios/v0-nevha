"use client"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
    MessageSquare,
    AlertTriangle,
    ChevronRight,
    Phone,
    FileText,
    Shield,
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

    return (
        <div className="min-h-screen bg-background">
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
                        <h1 className="text-lg font-bold text-foreground">Northfields Executive</h1>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Village HOA</p>
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
                            className="relative px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-primary/5"
                        >
                            {item.label}
                        </Link>
                    ))}
                    <Link href="/admin">
                        <Button variant="default" className="ml-4">
                            Admin
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Mobile Header */}
            <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-border/40 px-5 py-4">
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
                            <h1 className="text-base font-bold text-foreground">Northfields Executive</h1>
                            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Village H.O.A.</p>
                        </div>
                    </div>
                    <Link href="/admin">
                        <Button size="sm" variant="ghost">
                            Admin
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8">

                {/* Simple Greeting Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold text-foreground">
                            {greeting}, Neighbor! 👋
                        </h1>
                        <div className="flex items-center gap-2">
                            {/* Optional User Avatar or Profile Link could go here */}
                        </div>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Welcome to your community hub.
                    </p>
                </div>

                {/* Latest Updates (Compacted) */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-foreground tracking-tight">Latest Updates</h2>
                        <Link href="/announcements" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 group">
                            View All
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <div {...swipeHandlers} className="relative group">
                        <Card className="rounded-[1.5rem] border-border/50 shadow-sm bg-card overflow-hidden min-h-[220px] hover:shadow-md transition-shadow duration-300">
                            <CardContent className="p-0">
                                {loading ? (
                                    <div className="p-6 space-y-4">
                                        <Skeleton className="h-6 w-1/3 rounded-lg" />
                                        <Skeleton className="h-4 w-full rounded-md" />
                                        <Skeleton className="h-4 w-2/3 rounded-md" />
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
                                                    transition={{ duration: 0.3 }}
                                                    className="p-6"
                                                >
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${announcements[currentSlide].priority === "high"
                                                            ? "bg-red-50 text-red-600"
                                                            : "bg-blue-50 text-blue-600"
                                                            }`}>
                                                            {announcements[currentSlide].priority === "high" ? "Important" : "Notice"}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {new Date(announcements[currentSlide].publishDate || announcements[currentSlide].createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>

                                                    <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1">
                                                        {announcements[currentSlide].title}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                                        {announcements[currentSlide].content}
                                                    </p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Simple Dots for Pagination */}
                                        <div className="absolute bottom-4 right-6 flex gap-1.5">
                                            {announcements.map((_, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setCurrentSlide(idx)}
                                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide
                                                        ? "w-4 bg-primary"
                                                        : "w-1.5 bg-border hover:bg-muted-foreground/50"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-[220px] text-center p-6 text-muted-foreground">
                                        <MessageSquare className="w-8 h-8 opacity-20 mb-2" />
                                        <p className="text-sm">No new updates</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Services Grid (Compacted) */}
                <div>
                    <h2 className="text-lg font-bold text-foreground mb-4 tracking-tight">Essential Services</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <PremiumServiceCard
                            href="/report"
                            icon={FileText}
                            title="Report Concern"
                            description="Submit maintenance requests"
                            color="blue"
                        />

                        <PremiumServiceCard
                            href="/emergency"
                            icon={Phone}
                            title="Emergency"
                            description="24/7 security contacts"
                            color="red"
                        />

                        <PremiumServiceCard
                            href="/applications"
                            icon={Shield}
                            title="Applications"
                            description="Stickers, IDs, & Permits"
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
    // Minimalist Clean Styles
    const colorStyles = {
        blue: {
            bg: "bg-blue-50/50",
            text: "text-blue-600",
            groupHoverBg: "group-hover:bg-blue-50",
        },
        red: {
            bg: "bg-red-50/50",
            text: "text-red-600",
            groupHoverBg: "group-hover:bg-red-50",
        }
    }

    const style = colorStyles[color as keyof typeof colorStyles] || colorStyles.blue

    return (
        <Link href={href}>
            <div className={`group relative bg-card border border-border/40 rounded-[1.5rem] p-5 hover:border-border/80 hover:shadow-sm transition-all duration-200 cursor-pointer`}>
                <div className="flex items-center gap-4">
                    {/* Icon Container */}
                    <div className={`w-12 h-12 flex items-center justify-center rounded-2xl ${style.bg} ${style.text} transition-colors duration-200`}>
                        <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">{title}</h3>
                        <p className="text-xs text-muted-foreground truncate">{description}</p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
            </div>
        </Link>
    )
}
