import { AppSidebar } from "@/components/ui/app-sidebar"
import { SidebarCollapsedTrigger } from "@/components/ui/sidebar-collapsed-trigger"
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
            <SidebarInset className="min-h-svh">
                <SidebarCollapsedTrigger />
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}

export default SidebarLayout
