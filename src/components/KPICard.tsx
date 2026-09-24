import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  accent?: "red" | "gold";
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, accent = "red" }: KPICardProps) {
  const isGold = accent === "gold";
  return (
    <GlassCard hover className="!p-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] text-muted-foreground mb-1">{title}</p>
        {Icon && (
          <div className={cn("shrink-0 h-7 w-7 rounded-lg flex items-center justify-center", isGold ? "bg-gold/10" : "bg-primary/10")}>
            <Icon className={cn("h-3.5 w-3.5", isGold ? "text-gold" : "text-primary")} />
          </div>
        )}
      </div>
      <p className={cn(
        "font-display font-bold tracking-tight text-[19px] leading-none tabular-nums",
        isGold ? "text-gradient-gold" : "text-foreground"
      )}>
        {value}
      </p>
      {subtitle && (
        <p className={cn(
          "text-[10px] mt-1",
          trend === "up" && "text-emerald-400",
          trend === "down" && "text-primary",
          trend === "neutral" && "text-gold",
          !trend && "text-muted-foreground"
        )}>
          {subtitle}
        </p>
      )}
    </GlassCard>
  );
}
