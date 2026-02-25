"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Phone, AlertTriangle, Shield, MapPin } from "lucide-react"
import { motion } from "framer-motion"

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
}

export default function EmergencyPage() {
  const emergencyContacts = [
    {
      title: "Northfields Main Gate Guard",
      numbers: ["0995 076 1754"],
      description: "24/7 Security & Roaming Guard",
      icon: Shield,
      theme: "blue"
    },
    {
      title: "Bulacan Rescue",
      numbers: ["911", "(044) 791 0566"],
      description: "National Emergency & Rescue",
      icon: AlertTriangle,
      theme: "red"
    },
    {
      title: "Malolos Rescue",
      numbers: ["0928 226 9801", "0977 640 5828", "(044) 760 5160"],
      description: "City Disaster Risk Reduction",
      icon: AlertTriangle,
      theme: "orange"
    },
    {
      title: "Ace Hospital",
      numbers: ["(044) 816 7698", "0998 975 3115"],
      description: "Medical Center",
      icon: Phone,
      theme: "blue"
    },
    {
      title: "Bulacan Medical Center",
      numbers: ["0933 350 7791 (E.R. Triage)", "0923 449 8262 (E.R. Surgery)", "0919 853 7331", "(044) 449 4207"],
      description: "Hospital / Emergency Room",
      icon: Phone,
      theme: "blue"
    },
    {
      title: "Sacred Heart Hospital",
      numbers: ["(044) 794 4744", "794 7192", "791 2911"],
      description: "Hospital",
      icon: Phone,
      theme: "blue"
    },
    {
      title: "City Fire Station",
      numbers: ["0995 186 0370", "(044) 791 6129"],
      description: "Fire Emergencies",
      icon: AlertTriangle,
      theme: "red"
    },
    {
      title: "City Police Station",
      numbers: ["0933 610 4327", "0998 598 5383", "(044) 796 2483"],
      description: "Crime & Public Safety",
      icon: Shield,
      theme: "blue"
    },
    {
      title: "Calumpit Police Hotline",
      numbers: ["0998 598 5380"],
      description: "Neighboring City Police",
      icon: Shield,
      theme: "blue"
    },
    {
      title: "City Health Office",
      numbers: ["(044) 931 8888 Local 2207"],
      description: "Public Health Services",
      icon: Phone,
      theme: "blue"
    },
    {
      title: "City Mayor's Office",
      numbers: ["(044) 931 8888 Local 2201-2202"],
      description: "LGU Admin",
      icon: Phone,
      theme: "blue"
    },
    {
      title: "Philippine Red Cross",
      numbers: ["0968 243 3409", "(044) 662 5922"],
      description: "Blood & Medical Assistance",
      icon: Phone,
      theme: "red"
    },
    {
      title: "Malolos Water District",
      numbers: ["0917 103 6903", "(044) 896 0536"],
      description: "Water Utility",
      icon: Phone,
      theme: "blue"
    },
    {
      title: "Prime Water",
      numbers: ["0919 074 2083"],
      description: "Water Utility",
      icon: Phone,
      theme: "blue"
    },
    {
      title: "Meralco",
      numbers: ["16211"],
      description: "Power Outages & Lines",
      icon: Phone,
      theme: "orange"
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
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-32">
      {/* Sticky Glass Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 -ml-2 active:scale-95 transition-transform">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-[17px] font-semibold text-slate-900">Emergency</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6 overflow-hidden">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Urgent Note */}
          <motion.div variants={itemVariants} className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-[1.75rem] p-6 shadow-[0_10px_30px_-5px_rgba(239,68,68,0.3)] relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold tracking-tight">In immediate danger?</h2>
              </div>
              <p className="text-white/90 text-[15px] leading-relaxed mb-6 font-medium">
                Don't rely on this app alone. If someone is hurt or in danger, call national emergency services immediately.
              </p>
              <a href="tel:911" className="bg-white text-red-600 w-full h-14 rounded-2xl font-bold text-[17px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-transform">
                <Phone className="w-5 h-5" /> Call 911
              </a>
            </div>
            {/* Decoration */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          </motion.div>

          <motion.div variants={itemVariants}>
            <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider pl-4 pb-1">
              Important Contacts
            </h3>
          </motion.div>

          {/* Contact List */}
          <motion.div variants={containerVariants} className="space-y-3">
            {emergencyContacts.filter(c => c.numbers[0] !== "911").map((contact, i) => (
              <motion.div variants={itemVariants} key={i}>
                <a
                  href={`tel:${contact.numbers[0]}`}
                  className="bg-white rounded-[1.75rem] p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-100/50 flex items-center justify-between group active:scale-[0.98] transition-all hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${contact.theme === 'red' ? 'bg-red-50 text-red-600' :
                      contact.theme === 'orange' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                      <contact.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-[16px] leading-tight mb-0.5">{contact.title}</h4>
                      <p className="text-[13px] text-slate-500 font-medium mb-1">{contact.description}</p>
                      <p className={`text-[12px] font-bold ${contact.theme === 'red' ? 'text-red-600' :
                        contact.theme === 'orange' ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                        {contact.numbers.join(", ")}
                      </p>
                    </div>
                  </div>

                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-900 transition-colors shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                </a>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
