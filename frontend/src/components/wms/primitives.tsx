import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowRight, Info, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "primary",
  to,
  showArrow = false,
  compact = false,
  infoTooltip,
  showTrend = false,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone?: "primary" | "teal" | "success" | "warning" | "danger" | "purple";
  to?: string;
  showArrow?: boolean;
  compact?: boolean;
  infoTooltip?: string;
  showTrend?: boolean;
}) {
  const tones: Record<string, string> = {
    primary: "bg-[#EBF3FF] text-[#0866FF]",
    teal: "bg-[#F0FDFA] text-[#0D9488]",
    success: "bg-[#E8FAF2] text-[#16C784]",
    warning: "bg-[#FEF7EA] text-[#F5A623]",
    danger: "bg-[#FEECEE] text-[#E5484D]",
    purple: "bg-[#F3E8FF] text-[#7C4DFF]",
  };
  const accentBorders: Record<string, string> = {
    primary: "hover:border-[#0866FF]/40",
    teal: "hover:border-[#0D9488]/40",
    success: "hover:border-[#16C784]/40",
    warning: "hover:border-[#F5A623]/40",
    danger: "hover:border-[#E5484D]/40",
    purple: "hover:border-[#7C4DFF]/40",
  };
  const trendTones: Record<string, string> = {
    primary: "text-[#0866FF]",
    teal: "text-[#0D9488]",
    success: "text-[#16C784]",
    warning: "text-[#F5A623]",
    danger: "text-[#E5484D]",
    purple: "text-[#7C4DFF]",
  };

  const isLoading = value === "..." || value === "loading";

  const cardContent = (
    <Card
      className={cn(
        "relative flex h-full flex-col justify-between rounded-2xl border border-[#DCE6F3] bg-white p-4 shadow-xs transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md",
        accentBorders[tone] || "hover:border-primary/40",
        compact ? "min-h-[110px]" : "min-h-[136px]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className={cn("grid size-10 place-items-center rounded-xl", tones[tone] || tones.primary)}>
          <Icon className="size-5" />
        </span>
        {to && showArrow && (
          <ArrowRight className="size-3.5 -translate-x-1 text-[#526580] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
        )}
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-100" />
        ) : (
          <p className="text-[28px] lg:text-[32px] font-extrabold tracking-tight text-[#101D3A] leading-none tabular-nums">
            {value}
          </p>
        )}
      </div>

      <div className="mt-1 flex items-center gap-1.5 min-w-0">
        <p className="text-sm font-semibold text-[#526580] leading-snug truncate" title={label}>
          {label}
        </p>
        {infoTooltip && (
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={`Info: ${label}`}
                  className="inline-flex items-center justify-center rounded-full text-[#8FA3BF] hover:text-[#101D3A] focus:outline-none focus:ring-1 focus:ring-primary p-0.5 cursor-help transition-colors shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {infoTooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {showTrend && (
        <div className={cn("absolute right-4 top-1/2 mt-2 flex h-7 -translate-y-1/2 items-end gap-0.5", trendTones[tone])} aria-label={`${label} trend`}>
          {[35, 55, 42, 72, 58, 86, 68].map((height, index) => (
            <span
              key={index}
              className="w-1.5 rounded-t-sm bg-current opacity-70"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      )}
      {!compact && delta && (
        <p className="mt-1.5 min-h-4 text-xs font-medium text-[#526580]">
          {delta}
        </p>
      )}
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="group block h-full">
        {cardContent}
      </Link>
    );
  }
  return <div className="group block h-full">{cardContent}</div>;
}

export function Field({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="size-3 text-muted-foreground" />}
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <div className={cn("mt-1 truncate text-sm font-medium", mono && "font-mono tracking-tight")}>
        {value}
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  infoTooltip,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  infoTooltip?: string;
}) {
  return (
    <Card className={cn("gap-0 rounded-2xl border border-[#DCE6F3] bg-white p-0 shadow-xs", className)}>
      <div className="flex flex-wrap items-center gap-3 border-b border-[#DCE6F3] px-6 py-4">
        {Icon && (
          <span className="grid size-9 place-items-center rounded-xl bg-[#EBF3FF] text-[#0866FF]">
            <Icon className="size-[18px]" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold tracking-tight text-[#101D3A]">{title}</h2>
            {infoTooltip && (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Info: ${title}`}
                      className="inline-flex items-center justify-center rounded-full text-[#8FA3BF] hover:text-[#101D3A] focus:outline-none focus:ring-1 focus:ring-primary p-0.5 cursor-help transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <Info className="size-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {infoTooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {description && <p className="text-xs font-medium text-[#526580]">{description}</p>}
        </div>
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-6">{children}</div>
    </Card>
  );
}

export function Timeline({
  items,
}: {
  items: { time: string; title: string; detail: string; tone?: string }[];
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary",
    teal: "bg-teal",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
  };
  return (
    <ol className="relative space-y-5 border-l border-dashed border-border pl-6">
      {items.map((i, idx) => (
        <li key={idx} className="animate-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
          <span
            className={cn(
              "absolute -left-[5px] mt-1.5 size-2.5 rounded-full ring-4 ring-background",
              tones[i.tone ?? "primary"],
            )}
          />
          <div className="flex flex-wrap items-baseline gap-x-3">
            <p className="text-sm font-medium">{i.title}</p>
            <span className="font-mono text-[11px] text-muted-foreground">{i.time}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{i.detail}</p>
        </li>
      ))}
    </ol>
  );
}

export function StepRail({ current }: { current: number }) {
  const steps = [
    { n: 1, label: "Gate Entry", to: "/gate-entry" },
    { n: 2, label: "Vehicle", to: "/vehicle-verification" },
    { n: 3, label: "Driver", to: "/driver-verification" },
    { n: 4, label: "Vendor & PO", to: "/purchase-order" },
    { n: 5, label: "Accept", to: "/accept-arrival" },
    { n: 6, label: "Dock", to: "/dock-assignment" },
    { n: 7, label: "Dock Mgmt", to: "/dock-management" },
  ];
  return (
    <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-2xl border border-border/70 bg-card p-2 shadow-soft">
      {steps.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <div key={s.n} className="flex shrink-0 items-center">
            <Link
              to={s.to}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                active && "bg-primary-soft text-primary",
                done && "text-success hover:bg-success-soft",
                !active && !done && "text-muted-foreground hover:bg-accent",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[10px] font-semibold",
                  active && "bg-primary text-primary-foreground",
                  done && "bg-success text-success-foreground",
                  !active && !done && "bg-muted text-muted-foreground",
                )}
              >
                {done ? "✓" : s.n}
              </span>
              {s.label}
            </Link>
            {i < steps.length - 1 && <span className="mx-0.5 h-px w-4 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}
