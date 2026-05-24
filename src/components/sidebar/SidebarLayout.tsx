import { AppSidebar } from "@/components/ui/app-sidebar"
import { SidebarCollapsedTrigger } from "@/components/ui/sidebar-collapsed-trigger"
import { AgentShell } from "@/components/agent-shell/AgentShell"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"

const SidebarLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 68)",
                } as React.CSSProperties
            }
        >
            <AppSidebar variant="sidebar" />
            <SidebarInset className="min-h-svh flex flex-col">
                <SidebarCollapsedTrigger />
                <AgentShell>
                    <div className="flex-1 min-h-0 flex flex-col">{children}</div>
                </AgentShell>
            </SidebarInset>
        </SidebarProvider>
    )
}

export default SidebarLayout
