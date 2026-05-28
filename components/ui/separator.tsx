"use client"

import * as React from "react"
import { Divider } from "@vibe/core"

interface SeparatorProps {
  orientation?: "horizontal" | "vertical"
  className?: string
}

const Separator = ({ orientation = "horizontal", className }: SeparatorProps) => {
  return (
    <Divider
      direction={orientation === "vertical" ? "vertical" : "horizontal"}
      className={className}
    />
  )
}

export { Separator }
