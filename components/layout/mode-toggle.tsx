"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { usePreferences } from "@/hooks/use-preferences"

export function ModeToggle() {
    const { theme, setTheme: setNextTheme } = useTheme()
    const { updatePreference } = usePreferences()

    const handleThemeChange = (newTheme: string) => {
        setNextTheme(newTheme)
        updatePreference({ theme: newTheme })
    }

    return (
        <div className="flex items-center gap-1 bg-accent/50 p-1 rounded-lg border">
            <Button
                variant={theme === "light" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => handleThemeChange("light")}
                title="Light Mode"
            >
                <Sun className="h-4 w-4" />
                <span className="sr-only">Light Mode</span>
            </Button>
            <Button
                variant={theme === "dark" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => handleThemeChange("dark")}
                title="Dark Mode"
            >
                <Moon className="h-4 w-4" />
                <span className="sr-only">Dark Mode</span>
            </Button>
            <Button
                variant={theme === "system" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-md"
                onClick={() => handleThemeChange("system")}
                title="System Preference"
            >
                <Monitor className="h-4 w-4" />
                <span className="sr-only">System Preference</span>
            </Button>
        </div>
    )
}
