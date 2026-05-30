"use client"

import * as React from "react"
import { Skeleton as VibeSkeleton } from "@vibe/core"

interface SkeletonProps {
  className?: string
  variant?: "circle" | "rectangle" | "text"
  width?: number
  height?: number
}

const Skeleton = ({ className, variant = "text", width, height }: SkeletonProps) => {
  return (
    <VibeSkeleton
      type={variant}
      width={width}
      height={height}
      wrapperClassName={className}
    />
  )
}

export { Skeleton }
