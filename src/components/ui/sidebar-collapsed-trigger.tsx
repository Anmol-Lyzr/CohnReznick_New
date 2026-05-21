"use client"

import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

/** Floating toggle when the off-canvas sidebar is hidden (no top header bar). */
export function SidebarCollapsedTrigger() {
  const { state, openMobile, isMobile } = useSidebar()
  const show = isMobile ? !openMobile : state === "collapsed"

  if (!show) return null

  return (
    <SidebarTrigger
      className={cn(
        "fixed z-40 h-8 w-8 rounded-lg border border-border/60 bg-card/95 shadow-sm",
        "text-foreground hover:bg-muted/80",
        "left-3 top-3 md:left-4 md:top-4"
      )}
    />
  )
}
