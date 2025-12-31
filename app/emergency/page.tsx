"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Phone, AlertTriangle, Clock, MapPin, Shield } from "lucide-react"
import { BottomNav } from "@/components/ui/bottom-nav"

export default function EmergencyPage() {
  const emergencyContacts = [
    {
      title: "All Emergencies (911)",
      numbers: ["911"],
      description: "National emergency hotline",
      icon: AlertTriangle,
      color: "bg-red-500",
      urgent: true
    },
    {
      title: "Bulacan Rescue",
      numbers: ["911", "(044) 791 0566"],
      description: "Provincial rescue and emergency",
      icon: AlertTriangle,
      color: "bg-red-500",
      urgent: true
    },
    {
      title: "City Fire Station (Malolos)",
      numbers: ["0995 1860 370", "(044) 791-6129"],
      description: "Fire department emergency response",
      icon: AlertTriangle,
      color: "bg-red-500",
      urgent: true
    },
    {
      title: "City Police Station (Malolos)",
      numbers: ["(044) 796-2483"],
      description: "Police emergency and assistance",
      icon: Shield,
      color: "bg-red-500",
      urgent: true
    },
    {
      title: "Malolos Rescue",
      numbers: ["0928 2269 801", "0977 6405 828", "(044) 760-5160"],
      description: "Local rescue unit",
      icon: AlertTriangle,
      color: "bg-red-500",
      urgent: false
    },
    {
      title: "Northfields Main Gate Guard",
      numbers: ["0995 076 1754"],
      description: "24/7 community security hotline",
      icon: Shield,
      color: "bg-blue-500",
      urgent: false
    },
    {
      title: "ACE Hospital (Malolos)",
      numbers: ["(044) 816 7698", "0998 9753 115"],
      description: "Hospital and emergency room",
      icon: Phone,
      color: "bg-green-600",
      urgent: false
    },
    {
      title: "Bulacan Medical Center",
      numbers: [
        "0933 3507 791 (E.R. TRIAGE)",
        "0923 4498 262 (E.R. SURGERY)",
        "0919 8537 331",
        "(044) 449 4207"
      ],
      description: "Provincial hospital",
      icon: Phone,
      color: "bg-green-600",
      urgent: false
    },
    {
      title: "Sacred Heart Hospital",
      numbers: ["(044) 794 4744", "(044) 794 7192", "(044) 791 2911"],
      description: "Hospital and emergency room",
      icon: Phone,
      color: "bg-green-600",
      urgent: false
    },
    {
      title: "Philippine Red Cross (Bulacan)",
      numbers: ["0968 2433 409", "(044) 662 5922"],
      description: "Red Cross Bulacan Chapter",
      icon: Phone,
      color: "bg-rose-500",
      urgent: false
    },
    {
      title: "City Health Office (Malolos)",
      numbers: ["(044) 931 8888 LOCAL 2207"],
      description: "City Health Office",
      icon: Phone,
      color: "bg-green-500",
      urgent: false
    },
    {
      title: "City Mayor's Office (Malolos)",
      numbers: ["(044) 931 8888 LOCAL 2201-2202"],
      description: "City Mayor's Office",
      icon: Phone,
      color: "bg-indigo-500",
      urgent: false
    },
    {
      title: "Meralco",
      numbers: ["16211"],
      description: "Power utility hotline",
      icon: Phone,
      color: "bg-orange-500",
      urgent: false
    },
    {
      title: "PLDT",
      numbers: ["171"],
      description: "Telephone/internet provider hotline",
      icon: Phone,
      color: "bg-orange-500",
      urgent: false
    },
    {
      title: "Malolos Water District",
      numbers: ["0917 1036 903", "(044) 896 0536"],
      description: "Water utility",
      icon: Phone,
      color: "bg-cyan-500",
      urgent: false
    },
    {
      title: "Prime Water",
      numbers: ["0919 0742 083"],
      description: "Water utility",
      icon: Phone,
      color: "bg-cyan-500",
      urgent: false
    },
    {
      title: "Calumpit Police Hotline",
      numbers: ["0998 5985 380"],
      description: "Nearby municipality police hotline",
      icon: Shield,
      color: "bg-red-500",
      urgent: false
    }
  ]

  const toTel = (num: string) => {
    const base = num.replace(/local.*$/i, '').replace(/\(E\.R\..*?\)/gi, '').trim()
    const digits = base.replace(/[^\d+]/g, '')
    return digits
  }

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
              <h2 className="text-2xl font-bold text-foreground">Emergency Hotlines</h2>
              <p className="text-sm text-muted-foreground">Important contact numbers for emergencies</p>
            </div>
          </div>
        </div>

        {/* Emergency Notice */}
        <Card className="rounded-[2rem] border-2 border-destructive/20 shadow-lg bg-destructive/5 overflow-hidden mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-destructive rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-destructive text-lg mb-1">Life-Threatening Emergency</h3>
                <p className="text-sm text-destructive/80 leading-relaxed">
                  For immediate life-threatening emergencies, call <strong className="font-bold">911</strong> first, then notify NEVHA Security.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <div className="space-y-4">
          {emergencyContacts.map((contact, index) => {
            const Icon = contact.icon
            return (
              <Card key={index} className="rounded-[2rem] border-border/50 shadow-md hover:shadow-lg transition-shadow bg-card overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 ${contact.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-lg">{contact.title}</h3>
                        <p className="text-sm text-muted-foreground">{contact.description}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap sm:flex-col items-start sm:items-end gap-2 mt-2 sm:mt-0">
                      {contact.numbers.map((num, i) => (
                        <Button
                          key={i}
                          asChild
                          size="sm"
                          className={`rounded-full shadow-sm hover:shadow-md transition-all ${i === 0 ? `${contact.color} border-0 text-white font-bold hover:brightness-110` : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                        >
                          <a href={`tel:${toTel(num)}`} className="px-4">
                            {num}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Additional Information */}
        <Card className="rounded-[2rem] border-border/50 shadow-md bg-card overflow-hidden mt-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="p-4 rounded-2xl bg-secondary/30">
                <h4 className="font-bold text-foreground mb-1">NEVHA Security Hours</h4>
                <p>24/7 availability for all security-related concerns.</p>
              </div>
              <div className="p-4 rounded-2xl bg-secondary/30">
                <h4 className="font-bold text-foreground mb-1">Maintenance Emergency</h4>
                <p>Available 24/7 for urgent repairs that pose safety risks.</p>
              </div>
              <div className="p-4 rounded-2xl bg-secondary/30">
                <h4 className="font-bold text-foreground mb-1">Non-Emergency Issues</h4>
                <p>For non-urgent concerns, please use the <Link href="/report" className="text-primary font-medium hover:underline">Report a Concern</Link> feature.</p>
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
