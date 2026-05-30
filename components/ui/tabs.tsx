"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  activeValue?: string
  onValueChange?: (value: string) => void
}>({})

function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}) {
  const [internalValue, setInternalValue] = React.useState(
    defaultValue ?? value ?? ""
  )
  const isControlled = value !== undefined
  const activeValue = isControlled ? value : internalValue

  const handleChange = (newValue: string) => {
    if (!isControlled) setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider
      value={{ activeValue, onValueChange: handleChange }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)

  const enhanced = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<any>, {
        onClick: () => ctx.onValueChange?.(child.props.value),
      })
    }
    return child
  })

  return (
    <div ref={ref} className={cn("flex", className)} {...props}>
      {enhanced}
    </div>
  )
})
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }
>(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  const active = ctx.activeValue === value

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      data-state={active ? "active" : "inactive"}
      className={cn(className)}
      onClick={() => ctx.onValueChange?.(value!)}
      {...props}
    >
      {children}
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string }
>(({ className, children, value, ...props }, ref) => {
  const ctx = React.useContext(TabsContext)
  const active = ctx.activeValue === value

  if (!active) return null

  return (
    <div
      ref={ref}
      role="tabpanel"
      data-state="active"
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
