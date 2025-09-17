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
      title: "Police Emergency",
      number: "911",
      description: "For immediate police assistance",
      icon: Shield,
      color: "bg-red-500",
      urgent: true
    },
    {
      title: "Fire Emergency", 
      number: "911",
      description: "Fire department emergency response",
      icon: AlertTriangle,
      color: "bg-red-500",
      urgent: true
    },
    {
      title: "Medical Emergency",
      number: "911", 
      description: "Ambulance and medical emergency",
      icon: Phone,
      color: "bg-red-500",
      urgent: true
    },
    {
      title: "NEVHA Security",
      number: "(02) 8123-4567",
      description: "24/7 community security hotline",
      icon: Shield,
      color: "bg-blue-500",
      urgent: false
    },
    {
      title: "Maintenance Emergency",
      number: "(02) 8123-4568",
      description: "Water leaks, power outages, urgent repairs",
      icon: AlertTriangle,
      color: "bg-orange-500",
      urgent: false
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
              <h2 className="text-lg font-bold text-gray-900">Emergency Hotlines</h2>
              <p className="text-sm text-gray-600">Important contact numbers for emergencies</p>
            </div>
          </div>
        </div>

        {/* Emergency Notice */}
        <Card className="rounded-xl border-2 border-red-200 shadow-md bg-red-50 overflow-hidden mb-4">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-red-900 mb-1">Life-Threatening Emergency</h3>
                <p className="text-sm text-red-800 leading-relaxed">
                  For immediate life-threatening emergencies, call <strong>911</strong> first, then notify NEVHA Security.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <div className="space-y-3">
          {emergencyContacts.map((contact, index) => {
            const Icon = contact.icon
            return (
              <Card key={index} className={`rounded-xl border-0 shadow-md bg-white overflow-hidden border ${
                contact.urgent ? 'border-red-200' : 'border-gray-100'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${contact.color} rounded-xl flex items-center justify-center shadow-md`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{contact.title}</h3>
                        <p className="text-sm text-gray-600">{contact.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Button 
                        asChild
                        className={`${contact.color} hover:opacity-90 text-white font-bold`}
                      >
                        <a href={`tel:${contact.number.replace(/[^\d]/g, '')}`}>
                          {contact.number}
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Additional Information */}
        <Card className="rounded-xl border-0 shadow-md bg-white overflow-hidden border border-gray-100 mt-6">
          <CardHeader>
            <CardTitle className="text-gray-900 text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Important Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-700">
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">NEVHA Security Hours</h4>
                <p>24/7 availability for all security-related concerns</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Maintenance Emergency</h4>
                <p>Available 24/7 for urgent repairs that pose safety risks</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Non-Emergency Issues</h4>
                <p>For non-urgent concerns, please use the <Link href="/report" className="text-blue-600 underline">Report a Concern</Link> feature</p>
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
