"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  MessageSquare, 
  AlertTriangle, 
  Clock, 
  Phone, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  RefreshCw
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black font-inter">
      {/* Safe Area Top */}
      <div className="h-safe-area-inset-top bg-transparent" />
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="px-6 py-6 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white">
              Northfields
            </h1>
            <p className="text-sm text-gray-400">
              Executive Village HOA
            </p>
          </div>
        </div>
      </motion.header>

      {/* Hero Announcements Section */}
      <div className="px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <Card className="rounded-2xl border-0 shadow-2xl bg-gray-900/95 backdrop-blur-xl overflow-hidden border border-gray-700/30">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-80 px-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw className="w-8 h-8 text-gray-400" />
                  </motion.div>
                </div>
              ) : announcements.length > 0 ? (
                <div className="relative">
                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between p-6 pb-4">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={prevSlide}
                      className="w-11 h-11 rounded-full bg-gray-700/80 flex items-center justify-center hover:bg-gray-600/80 transition-all shadow-sm border border-gray-600/50"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-300" />
                    </motion.button>
                    
                    <div className="flex space-x-2">
                      {announcements.map((_, idx) => (
                        <motion.div
                          key={idx}
                          animate={{
                            scale: idx === currentSlide ? 1.2 : 1,
                            backgroundColor: idx === currentSlide ? "#FF6B35" : "#4B5563"
                          }}
                          transition={{ duration: 0.3 }}
                          className="w-2 h-2 rounded-full"
                        />
                      ))}
                    </div>
                    
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={nextSlide}
                      className="w-11 h-11 rounded-full bg-gray-700/80 flex items-center justify-center hover:bg-gray-600/80 transition-all shadow-sm border border-gray-600/50"
                    >
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </motion.button>
                  </div>

                  {/* Announcement Content */}
                  <div className="px-6 pb-8 min-h-[280px] flex items-center">
                    <AnimatePresence mode="wait">
                      {announcements[currentSlide] && (
                        <motion.div
                          key={currentSlide}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          className="text-center w-full"
                        >
                          <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className={`w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg ${
                              announcements[currentSlide].priority === "high"
                                ? "bg-gradient-to-br from-red-500 to-red-600"
                                : "bg-gradient-to-br from-blue-500 to-blue-600"
                            }`}
                          >
                            {announcements[currentSlide].priority === "high" ? (
                              <AlertTriangle className="w-10 h-10 text-white" />
                            ) : (
                              <MessageSquare className="w-10 h-10 text-white" />
                            )}
                          </motion.div>
                          
                          <h2 className="text-xl font-semibold text-white mb-4 leading-tight px-4">
                            {announcements[currentSlide].title}
                          </h2>
                          
                          <p className="text-base text-gray-300 leading-relaxed mb-6 px-4">
                            {announcements[currentSlide].content}
                          </p>
                          
                          <div className="flex items-center justify-center text-sm text-gray-400 mb-4">
                            <Clock className="w-4 h-4 mr-2" />
                            {new Date(announcements[currentSlide].publishDate || announcements[currentSlide].createdAt).toLocaleDateString()}
                          </div>
                          
                          {announcements[currentSlide].priority === "high" && (
                            <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 px-4 py-2 text-xs font-semibold rounded-full shadow-lg">
                              HIGH PRIORITY
                            </Badge>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* View all announcements CTA */}
                  <div className="px-6 pb-6 flex justify-center">
                    <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:bg-transparent">
                      <Link href="/announcements" className="inline-flex items-center gap-2">
                        View all announcements
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 px-6">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Stay Connected
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Community announcements will appear here
                    </p>
                  </motion.div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-6"
        >
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/30 shadow-2xl overflow-hidden">
            <Link href="/report">
              <motion.div
                whileTap={{ scale: 0.99 }}
                className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-all border-b border-gray-700/30"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-base font-medium text-white">Report a Concern</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.div>
            </Link>

            <Link href="/emergency">
              <motion.div
                whileTap={{ scale: 0.99 }}
                className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-all border-b border-gray-700/30"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Phone className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-base font-medium text-white">Emergency Hotline</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.div>
            </Link>

            <Link href="/applications">
              <motion.div
                whileTap={{ scale: 0.99 }}
                className="flex items-center justify-between p-4 hover:bg-gray-800/50 transition-all"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-base font-medium text-white">Applications</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation - Modern Dark Design */}
      <motion.nav
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="fixed bottom-4 left-4 right-4 bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/30"
      >
        <div className="flex justify-around items-center py-4 px-2">
          <Link href="/" className="flex flex-col items-center min-w-[60px] min-h-[60px] justify-center">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span className="text-white text-xs font-medium">Home</span>
            </motion.div>
          </Link>
          
          <Link href="/report" className="flex flex-col items-center min-w-[60px] min-h-[60px] justify-center">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <div className="w-12 h-12 bg-gray-700/80 rounded-2xl flex items-center justify-center mb-2 border border-gray-600/50">
                <FileText className="w-5 h-5 text-gray-300" />
              </div>
              <span className="text-gray-400 text-xs font-medium">Concern</span>
            </motion.div>
          </Link>
          
          <Link href="/emergency" className="flex flex-col items-center min-w-[60px] min-h-[60px] justify-center">
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center"
            >
              <div className="w-12 h-12 bg-gray-700/80 rounded-2xl flex items-center justify-center mb-2 border border-gray-600/50">
                <Phone className="w-5 h-5 text-gray-300" />
              </div>
              <span className="text-gray-400 text-xs font-medium">Hotline</span>
            </motion.div>
          </Link>
        </div>
      </motion.nav>

      {/* Safe Area Bottom */}
      <div className="h-24" />
    </div>
  )
}
