"use client";

import { useState } from "react";
import { Settings, Users, Shield, Trash2, Crown, Eye, Edit3, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Role = "Admin" | "Editor" | "Viewer";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  lastActive: string;
  isCurrentUser?: boolean;
}

const ROLE_CONFIG: Record<Role, { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string }> = {
  Admin:  { label: "Admin",  icon: Crown,  color: "text-primary",    bg: "bg-primary/10",   border: "border-primary/20"  },
  Editor: { label: "Editor", icon: Edit3,  color: "text-accent",   bg: "bg-accent/10",  border: "border-accent/20" },
  Viewer: { label: "Viewer", icon: Eye,    color: "text-muted-foreground", bg: "bg-muted/40", border: "border-border/50" },
};

const INITIAL_USERS: User[] = [
  { id: "u1", name: "Paul Johnson",     email: "paul.johnson@cohnreznick.com",  role: "Admin",  avatar: "PJ", lastActive: "Now",          isCurrentUser: true  },
  { id: "u2", name: "Rahul Gattani",    email: "rahul.gattani@cohnreznick.com", role: "Admin",  avatar: "RG", lastActive: "2 hours ago"                        },
  { id: "u3", name: "Sarah Chen",       email: "sarah.chen@cohnreznick.com",    role: "Editor", avatar: "SC", lastActive: "Yesterday"                          },
  { id: "u4", name: "Michael Torres",   email: "michael.torres@cohnreznick.com", role: "Editor", avatar: "MT", lastActive: "3 days ago"                         },
  { id: "u5", name: "Priya Patel",      email: "priya.patel@cohnreznick.com",   role: "Viewer", avatar: "PP", lastActive: "1 week ago"                         },
];

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  Admin:  ["View all pages", "Approve client-facing output", "Manage users", "Final sign-off", "Access settings"],
  Editor: ["View all pages", "Run diligence workflows", "Review and edit findings"],
  Viewer: ["View all pages", "View-only agent output and reports"],
};

function RoleDropdown({ userId, currentRole, onChange }: { userId: string; currentRole: Role; onChange: (id: string, role: Role) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = ROLE_CONFIG[currentRole];
  const Icon = cfg.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all", cfg.color, cfg.bg, cfg.border)}
      >
        <Icon className="w-3 h-3" />
        {currentRole}
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-full mt-1 z-20 glass-card rounded-xl overflow-hidden shadow-lg min-w-[120px]"
          >
            {(["Admin", "Editor", "Viewer"] as Role[]).map(role => {
              const c = ROLE_CONFIG[role];
              const RI = c.icon;
              return (
                <button
                  key={role}
                  onClick={() => { onChange(userId, role); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/40 transition-colors",
                    role === currentRole ? "font-semibold" : "font-normal text-muted-foreground"
                  )}
                >
                  <RI className={cn("w-3 h-3", c.color)} />
                  {role}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserAvatar({ initials, isCurrentUser }: { initials: string; isCurrentUser?: boolean }) {
  return (
    <div className={cn(
      "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0",
      isCurrentUser ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
    )}>
      {initials}
    </div>
  );
}

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [removedId, setRemovedId] = useState<string | null>(null);

  const handleRoleChange = (id: string, role: Role) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const handleRemove = (id: string) => {
    setRemovedId(id);
    setTimeout(() => {
      setUsers(prev => prev.filter(u => u.id !== id));
      setRemovedId(null);
    }, 350);
  };

  const adminCount = users.filter(u => u.role === "Admin").length;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage workspace members and their access levels</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Members", value: users.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Admins",        value: adminCount,   icon: Crown,  color: "text-primary", bg: "bg-primary/10" },
          { label: "Editors",       value: users.filter(u => u.role === "Editor").length, icon: Edit3, color: "text-accent", bg: "bg-accent/10" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("p-1.5 rounded-lg", stat.bg)}>
                  <Icon className={cn("w-3.5 h-3.5", stat.color)} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-xl overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Workspace Members</h2>
          </div>
        </div>

        <div className="divide-y divide-border/40">
          <AnimatePresence>
            {users.map(user => (
              <motion.div
                key={user.id}
                initial={{ opacity: 1 }}
                animate={{ opacity: removedId === user.id ? 0 : 1, x: removedId === user.id ? 20 : 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <UserAvatar initials={user.avatar} isCurrentUser={user.isCurrentUser} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    {user.isCurrentUser && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20 flex-shrink-0">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>

                <span className="text-[11px] text-muted-foreground/50 hidden sm:block flex-shrink-0 w-24 text-right">
                  {user.lastActive}
                </span>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {user.isCurrentUser ? (
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border", ROLE_CONFIG[user.role].color, ROLE_CONFIG[user.role].bg, ROLE_CONFIG[user.role].border)}>
                      {(() => { const I = ROLE_CONFIG[user.role].icon; return <I className="w-3 h-3" />; })()}
                      {user.role}
                    </div>
                  ) : (
                    <RoleDropdown userId={user.id} currentRole={user.role} onChange={handleRoleChange} />
                  )}

                  <button
                    onClick={() => !user.isCurrentUser && handleRemove(user.id)}
                    disabled={user.isCurrentUser}
                    title={user.isCurrentUser ? "Cannot remove yourself" : `Remove ${user.name}`}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      user.isCurrentUser
                        ? "text-muted-foreground/20 cursor-not-allowed"
                        : "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Role Permissions Reference */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border/50">
          <Shield className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Role Permissions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
          {(["Admin", "Editor", "Viewer"] as Role[]).map(role => {
            const cfg = ROLE_CONFIG[role];
            const Icon = cfg.icon;
            return (
              <div key={role} className="p-5">
                <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border mb-3", cfg.color, cfg.bg, cfg.border)}>
                  <Icon className="w-3 h-3" />
                  {role}
                </div>
                <ul className="space-y-1.5">
                  {ROLE_PERMISSIONS[role].map(perm => (
                    <li key={perm} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="text-primary mt-0.5">✓</span>
                      {perm}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
