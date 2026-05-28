"use client"

import * as React from "react"
import { Toggle } from "@vibe/core"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, className, id }, ref) => {
    return (
      <Toggle
        ref={ref as any}
        isSelected={checked}
        onChange={(value) => onCheckedChange?.(value)}
        disabled={disabled}
        className={className}
        id={id}
      />
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
