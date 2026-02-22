"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Phone, AlertTriangle, Shield, MapPin } from "lucide-react"

export default function EmergencyPage() {
  const emergencyContacts = [
    {
      title: "National Emergency",
      numbers: ["911"],
      description: "Police, Fire, Medical usually respond.",
      icon: AlertTriangle,
      theme: "red"
    },
    {
      title: "Northfields Guard House",
      numbers: ["0995 076 1754"],
      description: "24/7 Security & Roaming Guard",
      icon: Shield,
      theme: "blue"
    },
    {
      title: "Barangay Guginto",
      numbers: ["0933 460 3822"],
      description: "Barangay Hall / Public Safety",
      icon: MapPin,
      theme: "blue"
    },
    {
      title: "Malolos Rescue",
      numbers: ["(044) 760 5160"],
      description: "City Disaster Risk Reduction",
      icon: AlertTriangle,
      theme: "orange"
    },
    {
      title: "Meralco",
      numbers: ["16211"],
      description: "Power Outages & Lines",
      icon: Phone,
      theme: "orange"
    },
    {
      title: "Malolos Water",
      numbers: ["(044) 791 0358"],
      description: "Water Interruption",
      icon: Phone,
      theme: "blue"
    },
    {
      title: "PLDT",
      numbers: ["171"],
      description: "Internet & Landline",
      icon: Phone,
      theme: "red"
    }
  ]

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-10">
      {/* Sticky Glass Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-[17px] font-semibold text-slate-900">Emergency</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-4">

        {/* Urgent Note */}
        <div className="bg-red-500 text-white rounded-[1.75rem] p-6 shadow-lg shadow-red-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">In immediate danger?</h2>
            </div>
            <p className="text-white/90 text-[15px] leading-relaxed mb-6">
              Don't rely on this app alone. If someone is hurt or in danger, call national emergency services immediately.
            </p>
            <a href="tel:911" className="bg-white text-red-600 w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all">
              <Phone className="w-5 h-5" /> Call 911
            </a>
          </div>
          {/* Decoration */}
          <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        </div>

        <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider pl-4 pt-4 pb-2">
          Important Contacts
        </h3>

        {/* Contact List */}
        <div className="space-y-3">
          {emergencyContacts.filter(c => c.numbers[0] !== "911").map((contact, i) => (
            <div key={i} className="bg-white rounded-[1.75rem] p-5 shadow-sm border border-slate-100 flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${contact.theme === 'red' ? 'bg-red-50 text-red-600' :
                    contact.theme === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                  <contact.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-[16px]">{contact.title}</h4>
                  <p className="text-[13px] text-slate-500">{contact.description}</p>
                </div>
              </div>

              <a href={`tel:${contact.numbers[0]}`} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 hover:bg-slate-200 transition-colors">
                <Phone className="w-5 h-5" />
              </a>
            </div>
          ))}
        </div>

      </main>
    </div>
  )
}
