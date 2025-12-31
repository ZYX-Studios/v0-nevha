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
    <div className="min-h-screen bg-background font-sans">
      {/* Safe Area Top */}
      <div className="h-safe-area-inset-top bg-transparent" />

      {/* Header */}
      <header className="px-4 py-4 bg-white/80 backdrop-blur-md border-b border-border/40 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center space-x-3">
            <Image
              src="/NEVHA logo.svg"
              alt="NEVHA Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">NEVHA</h1>
              <p className="text-xs text-primary font-medium">Northfields Executive Village</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span>Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Button asChild variant="ghost" size="icon" className="rounded-full">
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Applications</h2>
              <p className="text-sm text-muted-foreground">Online services and applications</p>
            </div>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <Card className="rounded-[2.5rem] border-0 shadow-lg bg-gradient-to-br from-primary to-blue-600 overflow-hidden mb-8">
          <CardContent className="p-8 text-center relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Clock className="w-32 h-32 text-white" />
            </div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Coming Soon!</h3>
            <p className="text-blue-50 text-base leading-relaxed max-w-sm mx-auto">
              We're working hard to bring you convenient online applications and services.
              These features will be available soon to make your NEVHA experience even better.
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Features */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-foreground mb-4 px-2">What's Coming</h3>
          <div className="space-y-4">
            {upcomingFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card key={index} className="rounded-[2rem] border-border/50 shadow-sm bg-card overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${feature.color} bg-opacity-90 rounded-2xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground text-lg">{feature.title}</h4>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                      <div className="px-3 py-1 bg-secondary rounded-full text-xs text-muted-foreground font-semibold">
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
        <Card className="rounded-[2rem] border-border/50 shadow-lg bg-card overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-lg">Need Help Now?</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              While we're building these features, you can still get assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-secondary/50">
                <div>
                  <h4 className="font-bold text-foreground text-sm">Report Issues</h4>
                  <p className="text-xs text-muted-foreground">Submit concerns and requests</p>
                </div>
                <Button asChild size="sm" className="rounded-full shadow-md">
                  <Link href="/report" className="px-6">
                    Report
                  </Link>
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-2xl border border-secondary/50">
                <div>
                  <h4 className="font-bold text-foreground text-sm">Emergency Hotlines</h4>
                  <p className="text-xs text-muted-foreground">24/7 emergency contacts</p>
                </div>
                <Button asChild size="sm" variant="outline" className="rounded-full border-border/50 text-foreground hover:bg-secondary">
                  <Link href="/emergency" className="px-6">
                    Contact
                  </Link>
                </Button>
              </div>

              <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                <p className="text-sm text-primary/80">
                  <strong className="font-semibold text-primary">For immediate assistance:</strong> Visit the NEVHA office or call our main line during business hours.
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
