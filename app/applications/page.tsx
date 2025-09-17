"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Shield, Clock, MapPin, Wrench, FileText } from "lucide-react"
import { BottomNav } from "@/components/ui/bottom-nav"

export default function ApplicationsPage() {
  const upcomingFeatures = [
    {
      title: "Vehicle Sticker Application",
      description: "Apply for resident and visitor vehicle stickers online",
      icon: Shield,
      color: "bg-blue-500"
    },
    {
      title: "Parking Permits",
      description: "Request temporary and permanent parking permits",
      icon: FileText,
      color: "bg-green-500"
    },
    {
      title: "Amenity Reservations",
      description: "Book clubhouse, function halls, and recreational facilities",
      icon: Clock,
      color: "bg-purple-500"
    },
    {
      title: "Maintenance Requests",
      description: "Schedule non-emergency maintenance and repairs",
      icon: Wrench,
      color: "bg-orange-500"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 font-inter">
      {/* Safe Area Top */}
      <div className="h-safe-area-inset-top bg-transparent" />
      
      {/* Header */}
      <header className="px-4 py-4 bg-white/95 backdrop-blur-xl border-b border-blue-100 shadow-sm">
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
          <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-500">
            <MapPin className="w-3 h-3" />
            <span>Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-4">
        {/* Page Header */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-3">
            <Button asChild variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Applications</h2>
              <p className="text-sm text-gray-600">Online services and applications</p>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <Card className="rounded-xl border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 overflow-hidden mb-6">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Coming Soon!</h3>
            <p className="text-blue-100 text-sm leading-relaxed">
              We're working hard to bring you convenient online applications and services. 
              These features will be available soon to make your NEVHA experience even better.
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Features */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">What's Coming</h3>
          <div className="space-y-3">
            {upcomingFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100 opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center shadow-md opacity-60`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-700">{feature.title}</h4>
                        <p className="text-sm text-gray-500">{feature.description}</p>
                      </div>
                      <div className="text-xs text-gray-400 font-medium">
                        Soon
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Current Options */}
        <Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100">
          <CardHeader>
            <CardTitle className="text-gray-900 text-base">Need Help Now?</CardTitle>
            <CardDescription className="text-gray-600 text-sm">
              While we're building these features, you can still get assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Report Issues</h4>
                  <p className="text-xs text-gray-600">Submit concerns and requests</p>
                </div>
                <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Link href="/report">
                    Report
                  </Link>
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Emergency Hotlines</h4>
                  <p className="text-xs text-gray-600">24/7 emergency contacts</p>
                </div>
                <Button asChild size="sm" variant="outline" className="border-gray-200 text-gray-600 hover:bg-gray-50">
                  <Link href="/emergency">
                    Contact
                  </Link>
                </Button>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>For immediate assistance:</strong> Visit the NEVHA office or call our main line during business hours.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
