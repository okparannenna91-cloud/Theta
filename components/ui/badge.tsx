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
  count?: number
}

function Badge({ className, variant = "default", count, children, ...props }: BadgeProps) {
  if (count !== undefined) {
    return (
      <VibeBadge
        type="counter"
        color={variantToColor[variant]}
        count={count}
        className={cn("inline-flex", className)}
        {...(props as any)}
      >
        <span>{children}</span>
      </VibeBadge>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "border-transparent bg-primary text-primary-foreground",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground",
        variant === "destructive" && "border-transparent bg-destructive text-destructive-foreground",
        variant === "outline" && "text-foreground",
        className
      )}
      {...(props as any)}
    >
      {children}
    </span>
  )
}

export { Badge }
