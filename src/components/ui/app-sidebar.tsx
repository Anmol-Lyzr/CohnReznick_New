"use client"

import * as React from "react"
import {
    IconDashboard,
    IconPlugConnected,
    IconSettings,
    IconBook,
    IconSitemap,
    IconFolderOpen,
    IconUpload,
    IconChartLine,
    IconGitCompare,
    IconMessageQuestion,
    IconListCheck,
    IconFileReport,
    IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/ui/nav-main"
import { NavJourneys } from "@/components/ui/nav-journeys"
import { NavSecondary } from "@/components/ui/nav-secondary"
import { NavUser } from "@/components/ui/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import Logo from "../logo/Logo"
import Link from "next/link"
import { DEMO_USERS } from "@/lib/cohnreznick-metadata"
import { useAgentShell } from "@/context/AgentShellProvider"
import { Inbox, Command } from "lucide-react"

const data = {
    user: {
        name: DEMO_USERS[1].name,
        email: DEMO_USERS[1].email,
        avatar: "/avatars/shadcn.jpg",
    },
    navTop: [
        { title: "Dashboard", url: "/", icon: IconDashboard },
        { title: "TB Ingestion", url: "/tools/skills/trial-balance-ingestion", icon: IconUpload },
    ],
    navJourneys: [
        { title: "Customer Management",   url: "/tools/skills/customer-management",       icon: IconUsers },
        { title: "Anomaly Detection",     url: "/tools/skills/anomaly-detection",         icon: IconChartLine },
        { title: "Driver Analysis",       url: "/tools/skills/driver-analysis",           icon: IconGitCompare },
        { title: "Follow-Up Questions",   url: "/tools/skills/follow-up-questions",       icon: IconMessageQuestion },
        { title: "Issue Tracker",         url: "/tools/skills/issue-tracker",             icon: IconListCheck },
        { title: "Report Drafting",       url: "/tools/skills/report-drafting",           icon: IconFileReport },
    ],
    navTools: [
        {
            title: "Tools & Config",
            url: "/tools",
            icon: IconPlugConnected,
            subItems: [
                { title: "Skills Library",      url: "/tools/skills",        icon: IconBook         },
                { title: "Integrations",        url: "/tools",               icon: IconPlugConnected },
                { title: "Agent Architecture",  url: "/tools/architecture",  icon: IconSitemap      },
                { title: "File System",         url: "/tools/files",         icon: IconFolderOpen   },
            ],
        },
    ],
    navSecondary: [
        { title: "Settings", url: "/settings", icon: IconSettings },
    ],
}

function AgentShellSidebarFooter() {
    const { inboxCount, setInboxOpen, setCommandOpen } = useAgentShell()
    return (
        <div className="px-2 pb-2 flex flex-col gap-1">
            <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="flex items-center justify-between w-full text-[10px] text-muted-foreground hover:text-primary rounded-md px-2 py-1.5 hover:bg-sidebar-accent"
            >
                <span className="inline-flex items-center gap-1">
                    <Command className="w-3 h-3" /> Command palette
                </span>
                <kbd className="text-[9px] opacity-60">⌘K</kbd>
            </button>
            {inboxCount > 0 && (
                <button
                    type="button"
                    onClick={() => setInboxOpen(true)}
                    className="flex items-center gap-1 w-full text-[10px] font-semibold text-warning rounded-md px-2 py-1.5 bg-warning/10 hover:bg-warning/15"
                >
                    <Inbox className="w-3 h-3" />
                    {inboxCount} pending review
                </button>
            )}
        </div>
    )
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarRail />
            <SidebarHeader className="border-b border-sidebar-border/60">
                <div className="flex items-center gap-1 px-0.5">
                    <SidebarTrigger className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent" />
                    <SidebarMenu className="min-w-0 flex-1">
                        <SidebarMenuItem>
                            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:p-1.5!">
                                <Link href="/">
                                    <Logo />
                                    <span className="text-base font-semibold">CohnReznick</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navTop} />
                <NavJourneys items={data.navJourneys} />
                <NavMain items={data.navTools} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <AgentShellSidebarFooter />
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
