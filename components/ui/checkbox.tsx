"use client"

import * as React from "react"
import { Checkbox as VibeCheckbox } from "@vibe/core"

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
  label?: React.ReactNode
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked, onCheckedChange, disabled, className, id, label }, ref) => {
    return (
      <VibeCheckbox
        ref={ref}
        checked={checked}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        disabled={disabled}
        className={className}
        id={id}
        label={label}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
