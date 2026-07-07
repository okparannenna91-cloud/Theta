"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: "xs" | "small" | "medium" | "large"
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = "small", ...props }, ref) => {
    return (
      <div ref={ref} className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)} {...props}>
        {src ? (
          <Image src={src} alt={alt || ""} fill sizes="2.5rem" className="object-cover" />
        ) : fallback ? (
          <AvatarFallback>{fallback}</AvatarFallback>
        ) : null}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, alt, ...props }, ref) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} className={cn("aspect-square h-full w-full", className)} alt={alt || ""} {...props} />
  )
)
AvatarImage.displayName = "AvatarImage"

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...props} />
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }
