"use client"

import * as React from "react"
import { Badge as VibeBadge } from "@vibe/core"
import { cn } from "@/lib/utils"

const variantToColor: Record<string, "primary" | "dark" | "negative" | "light"> = {
  default: "primary",
  secondary: "light",
  destructive: "negative",
  outline: "dark",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <VibeBadge
      type="counter"
      color={variantToColor[variant]}
      count={0}
      className={cn("inline-flex", className)}
      {...(props as any)}
    >
      <span>{children}</span>
    </VibeBadge>
  )
}

export { Badge }
