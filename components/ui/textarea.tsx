"use client"

import * as React from "react"
import { TextArea } from "@vibe/core"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, onChange, ...props }, ref) => {
    return (
      <TextArea
        ref={ref as React.Ref<HTMLTextAreaElement>}
        className={className}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          onChange?.(e)
        }}
        {...(props as any)}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
