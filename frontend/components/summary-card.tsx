import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface SummaryCardProps {
  title: string
  value: number
  icon: LucideIcon
  variant?: "default" | "primary" | "success" | "destructive"
}

const variantStyles = {
  default: "bg-card",
  primary: "bg-primary/10",
  success: "bg-emerald-50 dark:bg-emerald-950/30",
  destructive: "bg-red-50 dark:bg-red-950/30",
}

const iconStyles = {
  default: "text-muted-foreground",
  primary: "text-primary",
  success: "text-emerald-600 dark:text-emerald-400",
  destructive: "text-red-600 dark:text-red-400",
}

export function SummaryCard({ title, value, icon: Icon, variant = "default" }: SummaryCardProps) {
  return (
    <Card className={cn("border-0 shadow-sm", variantStyles[variant])}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("rounded-lg bg-background p-2", iconStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
