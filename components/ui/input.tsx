"use client"

import * as React from "react"
import { TextField } from "@vibe/core"

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, onChange, value, ...props }, ref) => {
    return (
      <TextField
        ref={ref as React.Ref<HTMLInputElement>}
        type={type as any}
        wrapperClassName={className}
        value={value != null ? String(value) : undefined}
        onChange={(value: string, event: React.ChangeEvent<HTMLInputElement> | Pick<React.ChangeEvent<HTMLInputElement>, "target">) => {
          onChange?.(event as React.ChangeEvent<HTMLInputElement>)
        }}
        {...(props as any)}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
