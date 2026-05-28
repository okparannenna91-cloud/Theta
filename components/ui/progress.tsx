"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps {
  value?: number
  max?: number
  className?: string
  barClassName?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ value = 0, max = 100, className, barClassName }, ref) => {
    const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0
    return (
      <div
        ref={ref}
        className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      >
        <div
          className={cn("h-full w-full flex-1 bg-primary transition-all", barClassName)}
          style={{ transform: `translateX(-${100 - percent}%)` }}
        />
      </div>
    )
  }
)
Progress.displayName = "Progress"

export { Progress }
