'use client'

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const tabs = [
  { value: "all", label: "All" },
  { value: "recent", label: "Recent" },
]

export type TabValue = "all" | "recent"

export function PillTabs({ 
  value, 
  onValueChange, 
  className 
}: { 
  value: TabValue 
  onValueChange: (value: TabValue) => void 
  className?: string 
}) {
  return (
    <div className={cn("flex items-center gap-1 p-1 rounded-full bg-muted", className)}>
      {tabs.map(({ value: tabValue, label }) => {
        const selected = value === tabValue
        return (
          <Button
            key={tabValue}
            variant={selected ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-8 px-3 py-1 rounded-[10px] flex-0", // Pill shape
              selected ? "bg-background shadow-sm" : "text-muted-foreground hover:bg-muted/50"
            )}
            onClick={() => onValueChange(tabValue as TabValue)}
          >
            {label}
          </Button>
        )
      })}
    </div>
  )
}
