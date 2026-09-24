import { useMemo } from "react";
import { GlassCard } from "./GlassCard";
import { useSDRs } from "@/hooks/useSDRs";
import { useMetricasDiarias } from "@/hooks/useMetricasDiarias";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  start: string;
  end: string;
}

export function SDRPodium({ start, end }: Props) {
  const { data: sdrs = [] } = useSDRs();
  const { data: metricas = [] } = useMetricasDiarias();

  const ranked = useMemo(() => {
    return sdrs.map((sdr) => {
      const mine = metricas.filter(
        (m) => (m as any).sdr_id === sdr.id && m.data >= start && m.data <= end
      );
      const leads = mine.reduce((s, m) => s + (m.leads_recebidos || 0), 0);
      const agendadas = mine.reduce((s, m) => s + (m.reunioes_agendadas || 0), 0);
      const conv = leads > 0 ? (agendadas / leads) * 100 : 0;
      return { sdr, leads, agendadas, conv };
    }).sort((a, b) => b.agendadas - a.agendadas);
  }, [sdrs, metricas, start, end]);

  if (ranked.length === 0) return null;

  const top3 = ranked.slice(0, 3);
  // Visual podium arrangement: 2nd place (left) - 1st place (center, elevated) - 3rd place (right)
  const podiumOrder =
    top3.length === 3 ? [top3[1], top3[0], top3[2]] :
    top3.length === 2 ? [top3[1], top3[0]] :
    [top3[0]];
  const centerIndex = top3.length >= 2 ? 1 : 0;

  const barHeights = ["h-[60px]", "h-[90px]", "h-[45px]"];
  const orderedHeights =
    top3.length === 3 ? [barHeights[0], barHeights[1], barHeights[2]] :
    top3.length === 2 ? [barHeights[0], barHeights[1]] :
    [barHeights[1]];

  const initials = (nome: string) =>
    nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-4 w-4 text-primary" />
        <h2 className="font-display font-bold text-xl tracking-wide">Performance por SDR</h2>
      </div>

      <div className="flex items-end justify-center gap-4 max-w-xl mx-auto">
        {podiumOrder.map((r, i) => {
          const isCenter = i === centerIndex;
          return (
            <div
              key={r.sdr.id}
              className={cn("flex flex-col items-center", isCenter ? "w-36 -translate-y-2.5" : "w-28")}
            >
              {/* avatar */}
              <div
                className={cn(
                  "rounded-full flex items-center justify-center overflow-hidden mb-2 font-display font-bold text-foreground",
                  isCenter ? "h-14 w-14 text-lg bg-gradient-red" : "h-11 w-11 text-sm bg-muted"
                )}
              >
                {r.sdr.foto_url ? (
                  <img src={r.sdr.foto_url} alt={r.sdr.nome} className="h-full w-full object-cover rounded-full" />
                ) : (
                  initials(r.sdr.nome)
                )}
              </div>

              <p className={cn("text-center mb-1.5", isCenter ? "text-sm font-medium text-foreground" : "text-xs text-muted-foreground")}>
                {r.sdr.nome}
              </p>

              <div className="text-center mb-2 space-y-0.5">
                <p className="text-[10px] text-foreground/90">{r.leads} leads</p>
                <p className="text-[10px] text-foreground/90">{r.agendadas} reuniões</p>
                <p className="text-[10px] text-emerald-400">{r.conv.toFixed(0)}% conv.</p>
              </div>

              {/* podium bar */}
              <div
                className={cn("w-full rounded-t-md", orderedHeights[i])}
                style={{
                  background: isCenter
                    ? "linear-gradient(180deg, #3B82F6, #1e3a5f)"
                    : "linear-gradient(180deg, #2c4a6b, #1a2b3d)",
                }}
              />
            </div>
          );
        })}
      </div>

      {ranked.length > 3 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ranked.slice(3).map((r) => (
            <div key={r.sdr.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="h-10 w-10 rounded-full bg-gradient-red/40 flex items-center justify-center text-xs font-display font-bold shrink-0 overflow-hidden">
                {r.sdr.foto_url
                  ? <img src={r.sdr.foto_url} alt={r.sdr.nome} className="h-full w-full object-cover rounded-full" />
                  : initials(r.sdr.nome)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.sdr.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {r.leads} leads · {r.agendadas} agend · {r.conv.toFixed(0)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
