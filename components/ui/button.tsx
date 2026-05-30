"use client"

import * as React from "react"
import { Button as VibeButton } from "@vibe/core"
import { cn } from "@/lib/utils"

const variantToKind: Record<string, "primary" | "secondary" | "tertiary"> = {
  default: "primary",
  destructive: "primary",
  outline: "tertiary",
  secondary: "secondary",
  ghost: "tertiary",
  link: "tertiary",
}

const variantToColor = {
  default: "primary" as const,
  destructive: "negative" as const,
  outline: "primary" as const,
  secondary: "primary" as const,
  ghost: "primary" as const,
  link: "primary" as const,
}

const sizeToSize: Record<string, "xxs" | "xs" | "small" | "medium" | "large"> = {
  default: "medium",
  sm: "small",
  lg: "large",
  icon: "small",
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild, children, ...props }, ref) => {
    return (
      <VibeButton
        ref={ref}
        kind={variantToKind[variant]}
        color={variantToColor[variant] as any}
        size={sizeToSize[size]}
        className={cn(className)}
        {...(props as any)}
      >
        {children}
      </VibeButton>
    )
  }
)
Button.displayName = "Button"

export { Button }
