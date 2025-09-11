import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Minus, ArrowUp, Zap } from "lucide-react"

interface PriorityBadgeProps {
  priority: string
  showIcon?: boolean
}

export function PriorityBadge({ priority, showIcon = true }: PriorityBadgeProps) {
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "urgent":
        return {
          variant: "destructive" as const,
          icon: <Zap className="h-3 w-3" />,
          label: "Urgent",
          className: "bg-destructive text-destructive-foreground",
        }
      case "high":
        return {
          variant: "secondary" as const,
          icon: <ArrowUp className="h-3 w-3" />,
          label: "High",
          className: "bg-secondary text-secondary-foreground",
        }
      case "low":
        return {
          variant: "outline" as const,
          icon: <Minus className="h-3 w-3" />,
          label: "Low",
          className: "border-muted text-muted-foreground",
        }
      default: // normal
        return {
          variant: "outline" as const,
          icon: <AlertTriangle className="h-3 w-3" />,
          label: "Normal",
          className: "border-primary text-primary",
        }
    }
  }

  const config = getPriorityConfig(priority)

  return (
    <Badge variant={config.variant} className={`flex items-center space-x-1 ${config.className}`}>
      {showIcon && config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}
