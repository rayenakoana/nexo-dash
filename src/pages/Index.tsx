import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { KPICard } from "@/components/KPICard";
import { GlassCard } from "@/components/GlassCard";
import { AIAnalysisButton } from "@/components/AIAnalysisButton";
import { SDRPodium } from "@/components/SDRPodium";
import { MetaXVendidoFunil } from "@/components/MetaXVendidoFunil";
import { LeadsDiariosCard } from "@/components/LeadsDiariosCard";
import { useVendas } from "@/hooks/useVendas";
import { useCustosMarketing } from "@/hooks/useCustosMarketing";
import { usePerformanceReunioes } from "@/hooks/usePerformanceReunioes";
import { useMetricasDiarias } from "@/hooks/useMetricasDiarias";
import { useConfiguracoes } from "@/hooks/useConfiguracoes";
import { PIPELINE_IDS } from "@/lib/funis";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign, Target, TrendingUp, Clock, BadgeDollarSign,
  Users, BarChart3, PieChart as PieChartIcon, AlertTriangle, CalendarCheck, Percent,
  RefreshCw, ShoppingCart, Filter,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, ComposedChart, Area,
} from "recharts";

const COLORS = ["#3B82F6", "#22D3EE", "#8B5CF6", "#60A5FA", "#2563EB", "#0EA5E9", "#93C5FD"];

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "month", label: "Este Mês" },
  { value: "quarter", label: "Trimestre" },
  { value: "custom", label: "Personalizado" },
  { value: "all", label: "Tudo" },
];

function getDateRange(period: string, customStart: string, customEnd: string) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  if (period === "all") return { start: "2000-01-01", end: "2099-12-31" };
  if (period === "today") return { start: today, end: today };
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    return { start, end: today };
  }
  if (period === "quarter") {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), qMonth, 1).toISOString().split("T")[0];
    return { start, end: today };
  }
  return { start: customStart || "2000-01-01", end: customEnd || "2099-12-31" };
}

const tooltipStyle = { background: "#111", border: "1px solid hsl(0 0% 12%)", borderRadius: "8px", fontSize: 12 };

function PieTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const { name, value } = payload[0];
  return (
    <div style={{ ...tooltipStyle, padding: "8px 12px", whiteSpace: "nowrap" }}>
      <div style={{ color: "#fff", fontWeight: 600 }}>{name}</div>
      <div style={{ color: "#ccc" }}>{value} leads</div>
    </div>
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="space-y-3" style={{ height }}>
      <div className="flex items-end gap-2 h-full">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${30 + Math.random() * 60}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function Index() {
  const { data: vendas = [], isLoading: loadingVendas } = useVendas();
  const { data: custos = [], isLoading: loadingCustos } = useCustosMarketing();
  const { data: reunioes = [], isLoading: loadingReunioes } = usePerformanceReunioes();
  const { data: metricasDiarias = [], isLoading: loadingMetricas } = useMetricasDiarias();
  const { data: funis = [] } = useConfiguracoes("Funil");
  const { data: produtos = [] } = useConfiguracoes("Produto");
  const { data: campanhas = [] } = useConfiguracoes("Campanha");
  const { data: origens = [] } = useConfiguracoes("Origem");
  const { data: metaVendaGeralCfg = [] } = useConfiguracoes("Meta Venda Geral");
  const { data: metaRenovacaoCfg = [] } = useConfiguracoes("Meta Renovação");
  const { data: metaVolumeCfg = [] } = useConfiguracoes("Meta Volume Vendas");

  const [period, setPeriod] = useState("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [filterFunis, setFilterFunis] = useState<string[]>([]);
  const toggleFunil = (nome: string) => {
    setFilterFunis(prev => prev.includes(nome) ? prev.filter(f => f !== nome) : [...prev, nome]);
  };
  const [filterProduto, setFilterProduto] = useState("Todos");
  const [filterCampanha, setFilterCampanha] = useState("Todos");
  const [filterOrigem, setFilterOrigem] = useState("Todos");
  const [excludeRenovacao, setExcludeRenovacao] = useState(false);
  const filtrosPainelCount = [
    period !== "month",
    filterProduto !== "Todos",
    filterCampanha !== "Todos",
    filterOrigem !== "Todos",
    excludeRenovacao,
  ].filter(Boolean).length;

  const { start, end } = getDateRange(period, customStart, customEnd);

  const pipelineIdsFiltrados = filterFunis.map(f => PIPELINE_IDS[f]).filter(Boolean);
  const todosFunisSelecionados = filterFunis.length === 0;

  const { data: mqlDiarioRaw = [], isLoading: loadingMqlDiario } = useQuery({
    queryKey: ["ritmo_mql_diario", start, end, filterFunis],
    queryFn: async () => {
      let q = supabase
        .from("leads_geografia")
        .select("created_at, pipeline_id")
        .eq("deletado", false)
        .in("rating", [3, 5])
        .gte("created_at", start)
        .lte("created_at", end + "T23:59:59");
      if (!todosFunisSelecionados) q = q.in("pipeline_id", pipelineIdsFiltrados);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reunioesDiarioRaw = [], isLoading: loadingReunioesDiario } = useQuery({
    queryKey: ["ritmo_reunioes_diario", start, end, filterFunis],
    queryFn: async () => {
      let q = supabase
        .from("reunioes_agendadas")
        .select("data, pipeline_id, compareceu")
        .gte("data", start)
        .lte("data", end);
      if (!todosFunisSelecionados) q = q.in("pipeline_id", pipelineIdsFiltrados);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: leadsDiarioRaw = [], isLoading: loadingLeadsDiario } = useQuery({
    queryKey: ["ritmo_leads_diario", start, end, filterFunis],
    queryFn: async () => {
      let q = supabase
        .from("leads_diarios_por_funil")
        .select("total_leads, total_leads_pagos, pipeline_id")
        .gte("data", start)
        .lte("data", end);
      if (!todosFunisSelecionados) q = q.in("pipeline_id", pipelineIdsFiltrados);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const isLoading = loadingVendas || loadingCustos || loadingReunioes || loadingMetricas || loadingMqlDiario || loadingReunioesDiario || loadingLeadsDiario;

  // Vendas filtradas por data_entrada (visão de Safra / Marketing)
  const filteredVendas = useMemo(() => {
    return vendas.filter(v => {
      if (v.data_entrada < start || v.data_entrada > end) return false;
      if (filterFunis.length > 0 && !filterFunis.includes(v.funil)) return false;
      if (filterProduto !== "Todos" && v.produto !== filterProduto) return false;
      if (filterCampanha !== "Todos" && v.campanha !== filterCampanha) return false;
      if (filterOrigem !== "Todos" && v.origem !== filterOrigem) return false;
      return true;
    });
  }, [vendas, start, end, filterFunis, filterProduto, filterCampanha, filterOrigem]);

  // Vendas filtradas por data_fechamento (visão Financeira / Faturamento)
  const vendasFechamentoNoPeriodo = useMemo(() => {
    return vendas.filter(v => {
      if (!v.data_fechamento) return false;
      if (v.data_fechamento < start || v.data_fechamento > end) return false;
      if (v.status !== "Fechado") return false;
      if (filterFunis.length > 0 && !filterFunis.includes(v.funil)) return false;
      if (filterProduto !== "Todos" && v.produto !== filterProduto) return false;
      if (filterCampanha !== "Todos" && v.campanha !== filterCampanha) return false;
      if (filterOrigem !== "Todos" && v.origem !== filterOrigem) return false;
      return true;
    });
  }, [vendas, start, end, filterFunis, filterProduto, filterCampanha, filterOrigem]);

  const filteredCustos = useMemo(() => custos.filter(c => {
    if (c.data < start || c.data > end) return false;
    if (filterFunis.length > 0 && !filterFunis.map(f => f.toUpperCase()).includes((c.produto || "").toUpperCase())) return false;
    return true;
  }), [custos, start, end, filterFunis]);
  const filteredReunioes = useMemo(() => reunioes.filter(r => r.data >= start && r.data <= end), [reunioes, start, end]);

  const filteredMetricas = useMemo(() => {
    return metricasDiarias.filter(m => {
      if (m.data < start || m.data > end) return false;
      if (filterFunis.length > 0 && !filterFunis.includes(m.funil)) return false;
      return true;
    });
  }, [metricasDiarias, start, end, filterFunis]);

  // === KPIs Financeiros (por data_fechamento) ===
  const vendasParaFaturamento = excludeRenovacao
    ? vendasFechamentoNoPeriodo.filter(v => !v.is_renovacao)
    : vendasFechamentoNoPeriodo;
  const faturamento = vendasParaFaturamento.reduce((s, v) => s + Number(v.valor), 0);
  const faturamentoRenovacao = vendasFechamentoNoPeriodo.filter(v => v.is_renovacao).reduce((s, v) => s + Number(v.valor), 0);
  const pctReceitaRenovacao = (faturamento + (excludeRenovacao ? faturamentoRenovacao : 0)) > 0
    ? (faturamentoRenovacao / (faturamento + (excludeRenovacao ? faturamentoRenovacao : 0))) * 100
    : 0;
  const ticketMedio = vendasParaFaturamento.length > 0 ? faturamento / vendasParaFaturamento.length : 0;

  const tempoMedio = useMemo(() => {
    const with2dates = vendasFechamentoNoPeriodo.filter(v => v.data_entrada && v.data_fechamento);
    if (with2dates.length === 0) return 0;
    const total = with2dates.reduce((s, v) => {
      const d1 = new Date(v.data_entrada).getTime();
      const d2 = new Date(v.data_fechamento!).getTime();
      return s + Math.max(0, (d2 - d1) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(total / with2dates.length);
  }, [vendasFechamentoNoPeriodo]);

  // === KPIs de Marketing (por data_entrada / Safra) ===
  const fechadasSafra = filteredVendas.filter(v => v.status === "Fechado" && v.data_fechamento);

  // === KPIs automáticos (RD CRM + Google Calendar) ===
  const totalLeadsDiarios = leadsDiarioRaw.reduce((s: number, r: any) => s + (r.total_leads || 0), 0);
  const totalLeadsPagos = leadsDiarioRaw.reduce((s: number, r: any) => s + (r.total_leads_pagos || 0), 0);
  const totalMQLDiarios = mqlDiarioRaw.length;
  const totalAgendadas = reunioesDiarioRaw.length;
  const totalCompareceramDiarios = reunioesDiarioRaw.filter((r: any) => r.compareceu).length;
  const pctAgendamento = totalMQLDiarios > 0 ? (totalAgendadas / totalMQLDiarios) * 100 : 0;
  const pctShowUpDiario = totalAgendadas > 0 ? (totalCompareceramDiarios / totalAgendadas) * 100 : 0;
  const pctLeadVenda = totalLeadsDiarios > 0 ? (fechadasSafra.length / totalLeadsDiarios) * 100 : 0;

  // === KPIs de Eficiência ===
  const totalCustosAds = filteredCustos.filter(c => c.categoria === "Ads").reduce((s, c) => s + Number(c.valor), 0);
  const totalCustos = filteredCustos.reduce((s, c) => s + Number(c.valor), 0);
  const totalLeads = filteredVendas.length;
  const cpl = totalLeadsPagos > 0 ? totalCustosAds / totalLeadsPagos : 0;
  const cac = vendasFechamentoNoPeriodo.length > 0 ? totalCustosAds / vendasFechamentoNoPeriodo.length : 0;
  const roi = totalCustosAds > 0 ? ((faturamento - totalCustosAds) / totalCustosAds * 100) : 0;

  // === Metas de Vendas (por mês selecionado) ===
  const mesRefAtual = useMemo(() => {
    if (period === "month" || period === "today") {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }
    // For custom/quarter, use the start date month
    if (start && start !== "2000-01-01") {
      const [y, m] = start.split("-");
      return `${y}-${m}`;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, [period, start]);

  const metaVendaGeral = useMemo(() => {
    const item = metaVendaGeralCfg.find(m => (m as any).mes_ref === mesRefAtual);
    return item ? Number(item.valor) || 0 : (metaVendaGeralCfg.length > 0 ? Number(metaVendaGeralCfg[0].valor) || 0 : 0);
  }, [metaVendaGeralCfg, mesRefAtual]);
  const metaRenovacao = useMemo(() => {
    const item = metaRenovacaoCfg.find(m => (m as any).mes_ref === mesRefAtual);
    return item ? Number(item.valor) || 0 : (metaRenovacaoCfg.length > 0 ? Number(metaRenovacaoCfg[0].valor) || 0 : 0);
  }, [metaRenovacaoCfg, mesRefAtual]);
  const metaVolume = useMemo(() => {
    const item = metaVolumeCfg.find(m => (m as any).mes_ref === mesRefAtual);
    return item ? Number(item.valor) || 0 : (metaVolumeCfg.length > 0 ? Number(metaVolumeCfg[0].valor) || 0 : 0);
  }, [metaVolumeCfg, mesRefAtual]);

  const totalRenovacoes = vendasFechamentoNoPeriodo.filter(v => v.is_renovacao).length;
  const pctRenovacao = metaRenovacao > 0 ? (totalRenovacoes / metaRenovacao) * 100 : 0;
  const totalVendasUnidades = vendasFechamentoNoPeriodo.length;

  const totalConfirmado = totalAgendadas;
  const totalReal = totalCompareceramDiarios;
  const showUpRate = totalConfirmado > 0 ? (totalReal / totalConfirmado) * 100 : 0;

  // === Insights ===
  const allTimeLeads = vendas.length;
  const allTimeAds = custos.filter(c => c.categoria === "Ads").reduce((s, c) => s + Number(c.valor), 0);
  const cplHistorico = allTimeLeads > 0 ? allTimeAds / allTimeLeads : 0;

  const insights = useMemo(() => {
    const alerts: { msg: string; severity: "warning" | "destructive" }[] = [];
    const mqlCount = totalMQLDiarios;
    const reuniaoCount = totalAgendadas;

    if (totalLeads > 0) {
      const convLeadMql = (mqlCount / totalLeads) * 100;
      if (convLeadMql < 35) alerts.push({ msg: `⚠️ Gargalo na Qualificação: Conversão Lead > Negociação em ${convLeadMql.toFixed(0)}% (meta: 35%)`, severity: "warning" });
    }
    if (mqlCount > 0) {
      const convMqlReuniao = (reuniaoCount / mqlCount) * 100;
      if (convMqlReuniao < 70) alerts.push({ msg: `⚠️ Gargalo na Proposta: Conversão Negociação > Proposta em ${convMqlReuniao.toFixed(0)}% (meta: 70%)`, severity: "warning" });
    }
    if (reuniaoCount > 0) {
      const convReunFech = (fechadasSafra.length / reuniaoCount) * 100;
      if (convReunFech < 30) alerts.push({ msg: `⚠️ Gargalo no Fechamento: Conversão Proposta > Venda em ${convReunFech.toFixed(0)}% (meta: 30%)`, severity: "warning" });
    }
    if (totalConfirmado > 0 && showUpRate < 70) {
      alerts.push({ msg: `⚠️ Atenção: Taxa de comparecimento em reuniões em ${showUpRate.toFixed(0)}% (meta: 70%)`, severity: "warning" });
    }
    if (cplHistorico > 0 && cpl > cplHistorico * 1.2) {
      alerts.push({ msg: `⚠️ Custo de Lead Elevado: CPL atual R$ ${cpl.toFixed(0)} está ${(((cpl - cplHistorico) / cplHistorico) * 100).toFixed(0)}% acima da média histórica (R$ ${cplHistorico.toFixed(0)})`, severity: "destructive" });
    }
    return alerts;
  }, [totalMQLDiarios, totalAgendadas, fechadasSafra, totalLeads, totalConfirmado, showUpRate, cpl, cplHistorico]);

  // === Chart data ===
  const funnelData = useMemo(() => {
    return [
      { name: "Leads", value: totalLeadsDiarios, fill: "#2563EB" },
      { name: "MQL", value: totalMQLDiarios, fill: "#3B82F6" },
      { name: "Reunião", value: totalAgendadas, fill: "#60A5FA" },
      { name: "Fechado", value: fechadasSafra.length, fill: "#22D3EE" },
    ];
  }, [totalLeadsDiarios, totalMQLDiarios, totalAgendadas, fechadasSafra]);

  const segmentoData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasFechamentoNoPeriodo.forEach(v => { const seg = v.segmento || "Sem segmento"; map[seg] = (map[seg] || 0) + Number(v.valor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [vendasFechamentoNoPeriodo]);

  const produtoData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasFechamentoNoPeriodo.forEach(v => { const p = v.produto || "Sem produto"; map[p] = (map[p] || 0) + Number(v.valor); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [vendasFechamentoNoPeriodo]);

  // === Gráfico de Faturamento por Dia (data_fechamento) ===
  const receitaDiariaData = useMemo(() => {
    const map: Record<string, number> = {};
    vendasFechamentoNoPeriodo.forEach(v => {
      const d = v.data_fechamento!;
      map[d] = (map[d] || 0) + Number(v.valor);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, valor]) => ({ data, valor }));
  }, [vendasFechamentoNoPeriodo]);

  const motivosData = useMemo(() => {
    const map: Record<string, number> = {};
    // Usa todas as vendas perdidas independente do período (visão histórica de padrão)
    const base = filterFunis.length > 0 ? vendas.filter(v => filterFunis.includes(v.funil)) : vendas;
    base.filter(v => v.status === "Perdido").forEach(v => { const m = v.motivo_perda || "Não informado"; map[m] = (map[m] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [vendas, filterFunis]);

  const showUpData = useMemo(() => {
    const dateMap: Record<string, { confirmado: number; real: number }> = {};
    reunioesDiarioRaw.forEach((r: any) => {
      if (!r.data) return;
      if (!dateMap[r.data]) dateMap[r.data] = { confirmado: 0, real: 0 };
      dateMap[r.data].confirmado += 1;
      if (r.compareceu) dateMap[r.data].real += 1;
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([data, vals]) => ({ data, Confirmado: vals.confirmado, Real: vals.real }));
  }, [reunioesDiarioRaw]);

  // === Daily performance pivot table ===
  const funilNames = useMemo(() => {
    const names = new Set(filteredMetricas.map(m => m.funil));
    return Array.from(names).sort();
  }, [filteredMetricas]);

  const dailyTableData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    filteredMetricas.forEach(m => {
      if (!dateMap[m.data]) dateMap[m.data] = {};
      dateMap[m.data][m.funil] = (dateMap[m.data][m.funil] || 0) + m.leads_recebidos;
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([data, funis]) => {
        const total = Object.values(funis).reduce((s, v) => s + v, 0);
        return { data, ...funis, TOTAL: total };
      });
  }, [filteredMetricas]);

  // === Conversion line chart data (automático: leads_geografia + reunioes_agendadas) ===
  const conversionLineData = useMemo(() => {
    const dateMap: Record<string, { mql: number; agendadas: number; compareceram: number }> = {};
    mqlDiarioRaw.forEach((m: any) => {
      const dia = (m.created_at || "").split("T")[0];
      if (!dia) return;
      if (!dateMap[dia]) dateMap[dia] = { mql: 0, agendadas: 0, compareceram: 0 };
      dateMap[dia].mql += 1;
    });
    reunioesDiarioRaw.forEach((r: any) => {
      if (!r.data) return;
      if (!dateMap[r.data]) dateMap[r.data] = { mql: 0, agendadas: 0, compareceram: 0 };
      dateMap[r.data].agendadas += 1;
      if (r.compareceu) dateMap[r.data].compareceram += 1;
    });
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, vals]) => ({ data, "Leads Qualificados": vals.mql, "Reuniões Agendadas": vals.agendadas, "Compareceram": vals.compareceram }));
  }, [mqlDiarioRaw, reunioesDiarioRaw]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display font-bold text-4xl md:text-5xl tracking-wide">
          <span className="text-gradient">DASHBOARD</span> GERAL
        </h1>
        <p className="text-muted-foreground text-sm mt-1 uppercase tracking-widest text-[11px]">Visão consolidada · Marketing & Comercial</p>
      </div>

      {/* Funil chips (pills), estilo do protótipo — acesso rápido */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setFilterFunis([])}
          className={cn("fchip", filterFunis.length === 0 && "active")}
        >
          Todos os funis
        </button>
        {funis.filter((f: any) => f.visivel !== false).map(f => {
          const active = filterFunis.includes(f.valor);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => toggleFunil(f.valor)}
              className={cn("fchip", active && "active")}
            >
              {f.valor}
            </button>
          );
        })}

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 bg-muted/50 ml-auto">
              <Filter className="h-3.5 w-3.5" /> Filtros
              {filtrosPainelCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full text-xs px-1.5 py-0.5 leading-none">
                  {filtrosPainelCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card border-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filtros {filtrosPainelCount > 0 && <span className="text-muted-foreground font-normal">({filtrosPainelCount})</span>}</SheetTitle>
            </SheetHeader>
            <div className="space-y-5 mt-6">
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Período</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>{PERIOD_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {period === "custom" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">De</Label>
                    <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-muted/50" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Até</Label>
                    <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-muted/50" />
                  </div>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Produto</Label>
                <Select value={filterProduto} onValueChange={setFilterProduto}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {produtos.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Campanha</Label>
                <Select value={filterCampanha} onValueChange={setFilterCampanha}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {campanhas.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Origem</Label>
                <Select value={filterOrigem} onValueChange={setFilterOrigem}>
                  <SelectTrigger className="bg-muted/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {origens.map(f => <SelectItem key={f.id} value={f.valor}>{f.valor}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={excludeRenovacao} onCheckedChange={setExcludeRenovacao} id="exclude-renovacao" />
                <Label htmlFor="exclude-renovacao" className="text-xs text-muted-foreground cursor-pointer">
                  Retirar renovação
                </Label>
              </div>
            </div>
            <SheetFooter className="mt-8 flex-row gap-2 sm:justify-start">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setPeriod("month"); setCustomStart(""); setCustomEnd("");
                  setFilterProduto("Todos"); setFilterCampanha("Todos"); setFilterOrigem("Todos");
                  setExcludeRenovacao(false);
                }}
              >
                Limpar filtros
              </Button>
              <SheetClose asChild>
                <Button className="flex-1 bg-primary hover:bg-primary/90">Aplicar filtros</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>


      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-primary" /> Insights de Performance
          </h2>
          {insights.map((alert, i) => (
            <div key={i} className={`rounded-lg border p-4 text-sm ${alert.severity === "destructive" ? "border-destructive/40 bg-destructive/10 text-foreground" : "border-primary/30 bg-primary/5 text-foreground"}`}>
              {alert.msg}
            </div>
          ))}
        </div>
      )}

      {/* Conversion KPIs from metricas_diarias */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Percent className="h-3.5 w-3.5" /> KPIs de Conversão (Input Diário)
          </h2>
          <AIAnalysisButton section="KPIs de Conversão" dataPayload={{
            periodo: PERIOD_OPTIONS.find(p => p.value === period)?.label ?? period,
            pct_agendamento: `${pctAgendamento.toFixed(1)}% (meta: 50%)`,
            pct_showup: `${pctShowUpDiario.toFixed(1)}% (meta: 70%)`,
            conversao_safra: `${pctLeadVenda.toFixed(1)}%`,
            total_leads_diarios: totalLeadsDiarios,
            mql_diarios: totalMQLDiarios,
            vendas_da_safra: fechadasSafra.length,
          }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />) : (
            <>
              <KPICard title="% Agendamento" value={`${pctAgendamento.toFixed(1)}%`} icon={CalendarCheck}
                subtitle={`Meta: 50% | ${totalAgendadas}/${totalMQLDiarios}`}
                trend={pctAgendamento >= 50 ? "up" : pctAgendamento > 0 ? "down" : "neutral"} />
              <KPICard title="% Show-up" value={`${pctShowUpDiario.toFixed(1)}%`} icon={Users}
                subtitle={`Meta: 70% | ${totalCompareceramDiarios}/${totalAgendadas}`}
                trend={pctShowUpDiario >= 70 ? "up" : pctShowUpDiario > 0 ? "down" : "neutral"} />
              <KPICard title="Conversão da Safra" value={`${pctLeadVenda.toFixed(1)}%`} icon={Target}
                subtitle={`${fechadasSafra.length} de ${totalLeadsDiarios} leads do período já converteram`}
                trend={pctLeadVenda >= 10 ? "up" : pctLeadVenda > 0 ? "down" : "neutral"} />
              <KPICard title="Total Leads Diários" value={totalLeadsDiarios} icon={BarChart3}
                subtitle={`MQL: ${totalMQLDiarios}`} />
            </>
          )}
        </div>
      </div>

      {/* Commercial KPIs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5" /> Métricas Comerciais
          </h2>
          <AIAnalysisButton section="Métricas Comerciais" dataPayload={{
            periodo: PERIOD_OPTIONS.find(p => p.value === period)?.label ?? period,
            faturamento_total: `R$ ${faturamento.toLocaleString("pt-BR")}`,
            meta_faturamento: metaVendaGeral > 0 ? `R$ ${metaVendaGeral.toLocaleString("pt-BR")} (${((faturamento / metaVendaGeral) * 100).toFixed(0)}% atingido)` : "não definida",
            faturamento_renovacao: `R$ ${faturamentoRenovacao.toLocaleString("pt-BR")}`,
            ticket_medio: `R$ ${ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`,
            total_vendas: totalVendasUnidades,
            meta_volume: metaVolume > 0 ? `${metaVolume} un. (${((totalVendasUnidades / metaVolume) * 100).toFixed(0)}% atingido)` : "não definida",
            roi: `${roi.toFixed(1)}%`,
            cac: totalCustosAds > 0 ? `R$ ${cac.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "sem dados de custo",
            cpl: totalCustosAds > 0 ? `R$ ${cpl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "sem dados de custo",
          }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />) : (
            <>
              <KPICard title="Faturamento Total" value={`R$ ${faturamento.toLocaleString("pt-BR")}`} icon={DollarSign}
                subtitle={metaVendaGeral > 0
                  ? `Meta: R$ ${metaVendaGeral.toLocaleString("pt-BR")} | ${((faturamento / metaVendaGeral) * 100).toFixed(0)}%`
                  : (excludeRenovacao
                      ? `${vendasParaFaturamento.length} vendas (sem renovação)`
                      : faturamentoRenovacao > 0
                        ? `dos quais R$ ${faturamentoRenovacao.toLocaleString("pt-BR")} (${pctReceitaRenovacao.toFixed(0)}%) é renovação`
                        : `${vendasFechamentoNoPeriodo.length} vendas fechadas`)}
                trend={metaVendaGeral > 0 ? (faturamento >= metaVendaGeral ? "up" : (faturamento >= metaVendaGeral * 0.8 ? "neutral" : "down")) : undefined}
              />
              <KPICard title="Fat. Renovação" value={`R$ ${faturamentoRenovacao.toLocaleString("pt-BR")}`} icon={RefreshCw}
                subtitle={metaRenovacao > 0
                  ? `Meta: ${metaRenovacao} un. | ${totalRenovacoes}/${metaRenovacao} (${pctRenovacao.toFixed(0)}%)`
                  : `${totalRenovacoes} renovações`}
                trend={metaRenovacao > 0 ? (pctRenovacao >= 100 ? "up" : (pctRenovacao >= 80 ? "neutral" : "down")) : undefined}
              />
              <KPICard title="Ticket Médio" value={`R$ ${ticketMedio.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={Target} />
              <KPICard title="Total Vendas" value={totalVendasUnidades} icon={ShoppingCart}
                subtitle={metaVolume > 0
                  ? `Meta: ${metaVolume} | ${((totalVendasUnidades / metaVolume) * 100).toFixed(0)}%`
                  : `${totalVendasUnidades} unidades`}
                trend={metaVolume > 0 ? (totalVendasUnidades >= metaVolume ? "up" : (totalVendasUnidades >= metaVolume * 0.8 ? "neutral" : "down")) : undefined}
              />
            </>
          )}
        </div>
      </div>

      {/* Revenue by Day Chart (data_fechamento) */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5" /> Faturamento por Dia (Data de Fechamento)
          </h3>
          <AIAnalysisButton section="Faturamento por Dia" dataPayload={{
            periodo: PERIOD_OPTIONS.find(p => p.value === period)?.label ?? period,
            faturamento_total: `R$ ${faturamento.toLocaleString("pt-BR")}`,
            total_dias_com_venda: receitaDiariaData.filter((d: any) => d.valor > 0).length,
            maior_dia: receitaDiariaData.length > 0 ? receitaDiariaData.reduce((max: any, d: any) => d.valor > max.valor ? d : max, receitaDiariaData[0]) : null,
            media_diaria: receitaDiariaData.length > 0 ? `R$ ${(faturamento / receitaDiariaData.filter((d: any) => d.valor > 0).length || 0).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}` : "—",
          }} />
        </div>
        {isLoading ? <ChartSkeleton /> : receitaDiariaData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={receitaDiariaData}>
              <XAxis dataKey="data" tick={{ fill: "#666", fontSize: 11 }} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
              <Bar dataKey="valor" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Faturamento" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem vendas fechadas no período</div>
        )}
      </GlassCard>

      {/* Meta x Vendido por Funil */}
      <MetaXVendidoFunil />

      {/* Marketing KPIs */}
      <div>
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <BadgeDollarSign className="h-3.5 w-3.5" /> Eficiência de Marketing
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px] rounded-xl" />) : (
            <>
              <KPICard title="CAC" value={`R$ ${cac.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={BadgeDollarSign} subtitle="Custo por Aquisição" />
              <KPICard title="CPL" value={`R$ ${cpl.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} icon={Target} subtitle={`${totalLeadsPagos} leads via Ads`} />
              <KPICard title="ROI Real" value={`${roi.toFixed(1)}%`} icon={TrendingUp} trend={roi > 0 ? "up" : roi < 0 ? "down" : "neutral"} subtitle={roi > 0 ? "Positivo" : roi < 0 ? "Negativo" : "Neutro"} />
              <KPICard title="Show-up Rate" value={`${showUpRate.toFixed(1)}%`} icon={Users} subtitle={`${totalReal}/${totalConfirmado} reuniões`} />
            </>
          )}
        </div>
      </div>

      {/* Conversion Line Chart */}
      <GlassCard>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" /> Ritmo do Funil — Conversão Diária
        </h3>
        {(loadingMqlDiario || loadingReunioesDiario) ? <ChartSkeleton /> : conversionLineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={conversionLineData}>
              <defs>
                <linearGradient id="gradQualificados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="data" tick={{ fill: "#666", fontSize: 11 }} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Leads Qualificados" stroke="#3B82F6" strokeWidth={2.5}
                fill="url(#gradQualificados)" dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="Reuniões Agendadas" stroke="#22D3EE" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Compareceram" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
        )}
      </GlassCard>

      {/* Performance por SDR (pódio) - OCULTO TEMPORARIAMENTE, ver Index.tsx linha ~685
      <SDRPodium start={start} end={end} />
      */}

      {/* Chegada de leads por funil */}
      <LeadsDiariosCard start={start} end={end} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Funil de Conversão
          </h3>
          {isLoading ? <ChartSkeleton height={220} /> : funnelData[0]?.value > 0 ? (
            <div className="space-y-3">
              {funnelData.map((stage, i) => {
                const pct = funnelData[0].value > 0 ? (stage.value / funnelData[0].value * 100) : 0;
                const loss = i > 0 ? funnelData[i - 1].value - stage.value : 0;
                const lossPct = i > 0 && funnelData[i - 1].value > 0 ? ((loss / funnelData[i - 1].value) * 100).toFixed(0) : null;
                return (
                  <div key={stage.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stage.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{stage.value}</span>
                        {lossPct && <span className="text-[10px] text-red-400/70">-{lossPct}%</span>}
                      </div>
                    </div>
                    <div className="h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                      <div className="h-full rounded-lg transition-all duration-700" style={{ width: `${pct}%`, background: stage.fill }} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white/80">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
            <PieChartIcon className="h-3.5 w-3.5" /> Motivos de Perda (histórico)
          </h3>
          {isLoading ? <ChartSkeleton /> : motivosData.length > 0 ? (() => {
            const total = motivosData.reduce((s, d) => s + d.value, 0);
            const MOTIVO_COLORS = ["#C8102E","#E8384F","#FF6B6B","#FF8E8E","#FFB4B4","#991B1B","#FCA5A5","#be123c","#e11d48","#fb7185"];
            return (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Donut sem labels inline */}
                <div className="flex-shrink-0 w-[180px] h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {MOTIVO_COLORS.map((c, i) => (
                          <linearGradient key={i} id={`gradPie2_${i}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={c} stopOpacity={0.6} />
                            <stop offset="100%" stopColor={c} stopOpacity={1} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie data={motivosData} cx="50%" cy="50%" outerRadius={80} innerRadius={44} dataKey="value" startAngle={90} endAngle={-270}>
                        {motivosData.map((_, i) => <Cell key={i} fill={`url(#gradPie2_${i % MOTIVO_COLORS.length})`} />)}
                      </Pie>
                      <Tooltip content={<PieTooltip />} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 50 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Lista ranking */}
                <div className="flex-1 w-full space-y-1.5 min-w-0">
                  {motivosData.slice(0, 8).map((d, i) => {
                    const pct = ((d.value / total) * 100).toFixed(0);
                    const cor = MOTIVO_COLORS[i % MOTIVO_COLORS.length];
                    return (
                      <div key={d.name} className="flex items-center gap-2 group">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[11px] text-foreground/80 truncate pr-2">{d.name}</span>
                            <span className="text-[11px] font-bold text-foreground/60 flex-shrink-0">{pct}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: cor }} />
                          </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0 w-6 text-right">{d.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Nenhum lead perdido no período</div>
          )}
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Receita por Segmento</h3>
          {isLoading ? <ChartSkeleton /> : segmentoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, segmentoData.length * 40)}>
              <BarChart data={segmentoData} layout="vertical" margin={{ left: 20 }}>
                <defs>
                  <linearGradient id="gradBarSegmento" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
                <XAxis type="number" tick={{ fill: "#666", fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#999", fontSize: 11 }} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                <Bar dataKey="value" fill="url(#gradBarSegmento)" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Receita por Produto</h3>
          {isLoading ? <ChartSkeleton /> : produtoData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(200, produtoData.length * 40)}>
              <BarChart data={produtoData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fill: "#666", fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#999", fontSize: 11 }} width={100} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
          <Users className="h-3.5 w-3.5" /> Show-up Rate — Confirmados vs. Compareceram
        </h3>
        {isLoading ? <ChartSkeleton /> : showUpData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={showUpData}>
              <XAxis dataKey="data" tick={{ fill: "#666", fontSize: 11 }} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="Confirmado" fill="#475569" radius={[4, 4, 0, 0]} name="Confirmados SDR" />
              <Bar dataKey="Real" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Compareceram" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">Sem dados no período</div>
        )}
      </GlassCard>


    </div>
  );
}
