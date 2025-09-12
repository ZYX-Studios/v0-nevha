// Reusable form section component for better organization and consistency

import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface FormSectionProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function FormSection({ title, description, children, className = "" }: FormSectionProps) {
  return (
    <Card className={`bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 shadow-xl ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-white">{title}</CardTitle>
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {children}
      </CardContent>
    </Card>
  )
}
