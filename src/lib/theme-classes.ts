/** Brown / earth-tone utility classes aligned with globals.css design tokens */

export const gradientAccent = "bg-gradient-to-r from-primary/10 to-accent/5";
export const gradientAccentBorder = "border-primary/25";

export const stat = {
  default: "bg-primary/10 border-primary/20",
  muted: "bg-muted/40 border-border/50",
  warning: "bg-warning/10 border-warning/25",
  success: "bg-success/10 border-success/25",
  destructive: "bg-destructive/10 border-destructive/25",
} as const;

export const badge = {
  approved: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  edited: "bg-primary/15 text-primary border-primary/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  deferred: "bg-secondary/15 text-secondary border-secondary/30",
  excluded: "bg-muted text-muted-foreground border-border/50",
  accent: "bg-accent/15 text-accent border-accent/30",
} as const;

export const flag = {
  SPIKE: "bg-warning/15 text-warning border-warning/30",
  TREND: "bg-primary/15 text-primary border-primary/30",
  REVERSAL: "bg-accent/15 text-accent border-accent/30",
  STEP_CHANGE: "bg-warning/15 text-warning border-warning/30",
  MARGIN_COMPRESSION: "bg-destructive/15 text-destructive border-destructive/30",
} as const;

export const modal = {
  body: "bg-card",
  header: "bg-muted/90 border-border/50",
  footer: "bg-muted/70 border-border/50",
  title: "text-foreground",
  label: "text-muted-foreground",
  border: "border-primary/15",
} as const;

export const btn = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  primaryGradient: "bg-gradient-to-r from-primary to-[hsl(26,55%,42%)] text-primary-foreground hover:opacity-90",
  success: "bg-success text-success-foreground hover:bg-success/90",
  outline: "border border-primary/30 text-primary hover:bg-primary/10",
} as const;

export const actionBtn = {
  pending: "bg-warning/20 text-warning border-warning/50 hover:bg-warning/30",
  success: "bg-success/10 text-success border-success/35 hover:bg-success/20",
  accent: "bg-accent/10 text-accent border-accent/35 hover:bg-accent/20",
  muted: "bg-muted/50 text-muted-foreground border-border/50 cursor-not-allowed opacity-60",
} as const;
