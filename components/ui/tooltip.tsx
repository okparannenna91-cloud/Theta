"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipContext = React.createContext<{ content?: React.ReactNode }>({})

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

interface TooltipProps {
  children: React.ReactNode
  content?: React.ReactNode
  className?: string
}

const Tooltip = ({ children, content, className }: TooltipProps) => {
  const [open, setOpen] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>()

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(true), 200)
  }

  const handleMouseLeave = () => {
    clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setOpen(false), 100)
  }

  const memoizedContent = React.useMemo(() => {
    let tooltipContent: React.ReactNode = null
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === TooltipContent) {
        tooltipContent = (child as React.ReactElement<{ children?: React.ReactNode }>).props.children
      }
    })
    return tooltipContent
  }, [children])

  const extractedContent = content || memoizedContent

  return (
    <TooltipContext.Provider value={{ content: extractedContent }}>
      <div
        className="relative inline-flex"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && (child.type === TooltipContent || child.type === TooltipTrigger)) {
            return child
          }
          return child
        })}
        {open && extractedContent && (
          <div
            className={cn(
              "absolute z-50 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground shadow-md whitespace-nowrap",
              "-translate-x-1/2 left-1/2 -top-1 -translate-y-full",
              className
            )}
          >
            {extractedContent}
          </div>
        )}
      </div>
    </TooltipContext.Provider>
  )
}

const TooltipTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ className, asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, { ...(props as any), ref })
    }
    return (
      <button ref={ref as any} className={cn(className)} {...(props as any)}>
        {children}
      </button>
    )
  }
)
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(className)} {...props} />
  )
)
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
