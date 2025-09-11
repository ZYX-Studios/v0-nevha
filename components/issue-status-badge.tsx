import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertCircle, XCircle } from "lucide-react"

interface IssueStatusBadgeProps {
  status: string
  showIcon?: boolean
}

export function IssueStatusBadge({ status, showIcon = true }: IssueStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "resolved":
        return {
          variant: "default" as const,
          icon: <CheckCircle className="h-3 w-3" />,
          label: "Resolved",
          className: "bg-primary text-primary-foreground",
        }
      case "in_progress":
        return {
          variant: "secondary" as const,
          icon: <Clock className="h-3 w-3" />,
          label: "In Progress",
          className: "bg-secondary text-secondary-foreground",
        }
      case "closed":
        return {
          variant: "outline" as const,
          icon: <XCircle className="h-3 w-3" />,
          label: "Closed",
          className: "border-muted-foreground text-muted-foreground",
        }
      default: // open
        return {
          variant: "outline" as const,
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Open",
          className: "border-secondary text-secondary",
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge variant={config.variant} className={`flex items-center space-x-1 ${config.className}`}>
      {showIcon && config.icon}
      <span>{config.label}</span>
    </Badge>
  )
}
