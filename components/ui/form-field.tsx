// Enhanced form field component with consistent dark styling and better UX

import { ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface BaseFieldProps {
  label: string
  id: string
  required?: boolean
  disabled?: boolean
  className?: string
  icon?: ReactNode
}

interface InputFieldProps extends BaseFieldProps {
  type?: "text" | "email" | "tel" | "number"
  placeholder?: string
  value: string
  onChange: (value: string) => void
}

interface TextareaFieldProps extends BaseFieldProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  rows?: number
}

interface SelectFieldProps extends BaseFieldProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

const fieldClasses = "bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20"

export function InputField({ 
  label, 
  id, 
  type = "text", 
  placeholder, 
  value, 
  onChange, 
  required, 
  disabled, 
  className = "",
  icon 
}: InputFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className="text-gray-300 font-medium">
        {label}
        {required && <span className="text-orange-400 ml-1">*</span>}
      </Label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`${fieldClasses} ${icon ? 'pl-10' : ''} h-11`}
        />
      </div>
    </div>
  )
}

export function TextareaField({ 
  label, 
  id, 
  placeholder, 
  value, 
  onChange, 
  required, 
  disabled, 
  className = "",
  rows = 4 
}: TextareaFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className="text-gray-300 font-medium">
        {label}
        {required && <span className="text-orange-400 ml-1">*</span>}
      </Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        className={`${fieldClasses} resize-none`}
      />
    </div>
  )
}

export function SelectField({ 
  label, 
  id, 
  placeholder, 
  value, 
  onChange, 
  options, 
  required, 
  disabled, 
  className = "" 
}: SelectFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className="text-gray-300 font-medium">
        {label}
        {required && <span className="text-orange-400 ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={`${fieldClasses} h-11`}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600">
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="text-white hover:bg-gray-700 focus:bg-gray-700"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
