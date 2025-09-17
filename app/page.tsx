"use client"

import Link from "next/link"
import Image from "next/image"
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
  RefreshCw,
  Users,
  MapPin,
  Shield
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { BottomNav } from "@/components/ui/bottom-nav"
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 font-inter">
      {/* Safe Area Top */}
      <div className="h-safe-area-inset-top bg-transparent" />
      
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="px-4 py-4 bg-white/95 backdrop-blur-xl border-b border-blue-100 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image
              src="/NEVHA logo.svg"
              alt="NEVHA Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900">NEVHA</h1>
              <p className="text-xs text-blue-600 font-medium">Northfields Executive Village</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3" />
              <span>Portal</span>
            </div>
            <Link 
              href="/admin" 
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200 opacity-60 hover:opacity-100"
            >
              Admin
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="px-4 py-4">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-4"
        >
          <Card className="rounded-xl border-0 shadow-md bg-gradient-to-r from-blue-600 to-blue-700 overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-white">
                <div>
                  <h2 className="text-xl font-bold mb-1">Welcome Home!</h2>
                  <p className="text-blue-100 text-sm">Stay connected with your NEVHA community</p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Community Announcements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Community Updates</h3>
            <p className="text-sm text-gray-600">Latest neighborhood news</p>
          </div>
          
          <Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-48 px-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <RefreshCw className="w-6 h-6 text-blue-500" />
                  </motion.div>
                </div>
              ) : announcements.length > 0 ? (
                <div className="relative">
                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between p-4 pb-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={prevSlide}
                      className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-all shadow-sm border border-blue-200"
                    >
                      <ChevronLeft className="w-4 h-4 text-blue-600" />
                    </motion.button>
                    
                    <div className="flex space-x-1">
                      {announcements.map((_, idx) => (
                        <motion.div
                          key={idx}
                          animate={{
                            scale: idx === currentSlide ? 1.2 : 1,
                            backgroundColor: idx === currentSlide ? "#2563eb" : "#cbd5e1"
                          }}
                          transition={{ duration: 0.3 }}
                          className="w-2 h-2 rounded-full"
                        />
                      ))}
                    </div>
                    
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={nextSlide}
                      className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center hover:bg-blue-100 transition-all shadow-sm border border-blue-200"
                    >
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    </motion.button>
                  </div>

                  {/* Announcement Content */}
                  <div className="px-4 pb-4 min-h-[180px] flex items-center">
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
                            className={`w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-md ${
                              announcements[currentSlide].priority === "high"
                                ? "bg-gradient-to-br from-red-500 to-red-600"
                                : "bg-gradient-to-br from-blue-500 to-blue-600"
                            }`}
                          >
                            {announcements[currentSlide].priority === "high" ? (
                              <AlertTriangle className="w-7 h-7 text-white" />
                            ) : (
                              <MessageSquare className="w-7 h-7 text-white" />
                            )}
                          </motion.div>
                          
                          <h2 className="text-lg font-bold text-gray-900 mb-2 leading-tight px-2">
                            {announcements[currentSlide].title}
                          </h2>
                          
                          <p className="text-sm text-gray-700 leading-relaxed mb-3 px-2">
                            {announcements[currentSlide].content}
                          </p>
                          
                          <div className="flex items-center justify-center text-xs text-gray-500 mb-3">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(announcements[currentSlide].publishDate || announcements[currentSlide].createdAt).toLocaleDateString()}
                          </div>
                          
                          {announcements[currentSlide].priority === "high" && (
                            <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 px-3 py-1 text-xs font-semibold rounded-full shadow-md">
                              HIGH PRIORITY
                            </Badge>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* View all announcements CTA */}
                  <div className="px-4 pb-4 flex justify-center">
                    <Button asChild variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50 font-medium text-sm">
                      <Link href="/announcements" className="inline-flex items-center gap-1">
                        View all
                        <ChevronRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <MessageSquare className="w-12 h-12 text-blue-300 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Stay Connected
                    </h3>
                    <p className="text-gray-600 text-sm">
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
          <div className="mb-3">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Quick Actions</h3>
            <p className="text-sm text-gray-600">Essential services</p>
          </div>
          
          <div className="grid gap-3">
            <Link href="/report">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-lg transition-all p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Report a Concern</h4>
                      <p className="text-xs text-gray-600">Submit maintenance requests</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.div>
            </Link>

            <Link href="/emergency">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-lg transition-all p-4 hover:bg-red-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Emergency Hotline</h4>
                      <p className="text-xs text-gray-600">24/7 emergency contacts</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.div>
            </Link>

            <Link href="/applications">
              <motion.div
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-xl border border-gray-100 shadow-md hover:shadow-lg transition-all p-4 hover:bg-blue-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-900">Applications</h4>
                      <p className="text-xs text-gray-600">Vehicle stickers & permits</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
