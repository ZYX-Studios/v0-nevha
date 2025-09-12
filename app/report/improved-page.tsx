// Improved report page with better form organization and UX

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormSection } from "@/components/ui/form-section"
import { InputField, TextareaField, SelectField } from "@/components/ui/form-field"
import { ArrowLeft, Send, CheckCircle, AlertTriangle, User, MapPin, Mail, Phone, FileText, Calendar } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface ReportForm {
  reporter_name: string
  reporter_phone: string
  reporter_block: string
  reporter_lot: string
  reporter_phase: string
  reporter_street: string
  reporter_email: string
  concern_type: string
  concern_description: string
  concern_location: string
  concern_date: string
  concern_time: string
  priority: string
}

const initialForm: ReportForm = {
  reporter_name: "",
  reporter_phone: "",
  reporter_block: "",
  reporter_lot: "",
  reporter_phase: "",
  reporter_street: "",
  reporter_email: "",
  concern_type: "",
  concern_description: "",
  concern_location: "",
  concern_date: "",
  concern_time: "",
  priority: "medium"
}

const concernTypes = [
  { value: "noise", label: "Noise Complaint" },
  { value: "parking", label: "Parking Issue" },
  { value: "maintenance", label: "Maintenance Request" },
  { value: "security", label: "Security Concern" },
  { value: "utilities", label: "Utilities Issue" },
  { value: "common_area", label: "Common Area Issue" },
  { value: "other", label: "Other" }
]

const priorityOptions = [
  { value: "low", label: "Low Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "high", label: "High Priority" },
  { value: "urgent", label: "Urgent" }
]

export default function ImprovedReportPage() {
  const [form, setForm] = useState<ReportForm>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const updateField = (field: keyof ReportForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = (): boolean => {
    const required = ["reporter_name", "reporter_email", "concern_type", "concern_description"]
    return required.every(field => form[field as keyof ReportForm].trim() !== "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      setErrorMessage("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    setErrorMessage("")

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      setSubmitStatus("success")
    } catch (error) {
      setSubmitStatus("error")
      setErrorMessage("Failed to submit report. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm(initialForm)
    setSubmitStatus("idle")
    setErrorMessage("")
  }

  if (submitStatus === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8 text-center shadow-2xl">
              <div className="bg-green-500/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">Report Submitted!</h2>
              <p className="text-gray-400 mb-8">
                Your concern has been successfully submitted. We'll review it and get back to you soon.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={resetForm}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Submit Another Report
                </Button>
                <Link href="/">
                  <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-800">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white hover:bg-gray-800">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Submit a Report</h1>
            <p className="text-gray-400 mt-1">Let us know about any concerns or issues</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8">
          {/* Error Alert */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert variant="destructive" className="bg-red-900/50 border-red-700/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reporter Information */}
          <FormSection 
            title="Your Information" 
            description="Please provide your contact details"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Full Name"
                id="reporter_name"
                placeholder="Enter your full name"
                value={form.reporter_name}
                onChange={(value) => updateField("reporter_name", value)}
                required
                disabled={isSubmitting}
                icon={<User className="h-4 w-4" />}
              />
              <InputField
                label="Email Address"
                id="reporter_email"
                type="email"
                placeholder="your.email@example.com"
                value={form.reporter_email}
                onChange={(value) => updateField("reporter_email", value)}
                required
                disabled={isSubmitting}
                icon={<Mail className="h-4 w-4" />}
              />
            </div>
            
            <InputField
              label="Phone Number"
              id="reporter_phone"
              type="tel"
              placeholder="Enter your phone number"
              value={form.reporter_phone}
              onChange={(value) => updateField("reporter_phone", value)}
              disabled={isSubmitting}
              icon={<Phone className="h-4 w-4" />}
            />
          </FormSection>

          {/* Address Information */}
          <FormSection 
            title="Address Details" 
            description="Help us locate the issue"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField
                label="Block"
                id="reporter_block"
                placeholder="Block number"
                value={form.reporter_block}
                onChange={(value) => updateField("reporter_block", value)}
                disabled={isSubmitting}
              />
              <InputField
                label="Lot"
                id="reporter_lot"
                placeholder="Lot number"
                value={form.reporter_lot}
                onChange={(value) => updateField("reporter_lot", value)}
                disabled={isSubmitting}
              />
              <InputField
                label="Phase"
                id="reporter_phase"
                placeholder="Phase"
                value={form.reporter_phase}
                onChange={(value) => updateField("reporter_phase", value)}
                disabled={isSubmitting}
              />
            </div>
            
            <InputField
              label="Street"
              id="reporter_street"
              placeholder="Street name"
              value={form.reporter_street}
              onChange={(value) => updateField("reporter_street", value)}
              disabled={isSubmitting}
              icon={<MapPin className="h-4 w-4" />}
            />
          </FormSection>

          {/* Concern Details */}
          <FormSection 
            title="Concern Details" 
            description="Describe the issue you'd like to report"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectField
                label="Type of Concern"
                id="concern_type"
                placeholder="Select concern type"
                value={form.concern_type}
                onChange={(value) => updateField("concern_type", value)}
                options={concernTypes}
                required
                disabled={isSubmitting}
              />
              <SelectField
                label="Priority Level"
                id="priority"
                placeholder="Select priority"
                value={form.priority}
                onChange={(value) => updateField("priority", value)}
                options={priorityOptions}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField
                label="Date of Incident"
                id="concern_date"
                type="date"
                value={form.concern_date}
                onChange={(value) => updateField("concern_date", value)}
                disabled={isSubmitting}
                icon={<Calendar className="h-4 w-4" />}
              />
              <InputField
                label="Time of Incident"
                id="concern_time"
                type="time"
                value={form.concern_time}
                onChange={(value) => updateField("concern_time", value)}
                disabled={isSubmitting}
              />
            </div>

            <InputField
              label="Location of Concern"
              id="concern_location"
              placeholder="Specific location where the issue occurred"
              value={form.concern_location}
              onChange={(value) => updateField("concern_location", value)}
              disabled={isSubmitting}
              icon={<MapPin className="h-4 w-4" />}
            />

            <TextareaField
              label="Description"
              id="concern_description"
              placeholder="Please provide a detailed description of the concern or issue..."
              value={form.concern_description}
              onChange={(value) => updateField("concern_description", value)}
              required
              disabled={isSubmitting}
              rows={6}
            />
          </FormSection>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || !validateForm()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg font-medium disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Report
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
