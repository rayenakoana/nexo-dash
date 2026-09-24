import { useState, useMemo } from "react";
import { EmailMarketingSection } from "@/components/EmailMarketingSection";
import { GlassCard } from "@/components/GlassCard";
import { KPICard } from "@/components/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMetaAdsInsights } from "@/hooks/useMetaAdsInsights";
import { useWppCampanhasResumo } from "@/hooks/useWppCampanhasResumo";
import { useInstagramPostInsights, useInstagramAccountDaily, useInstagramProfileDaily } from "@/hooks/useInstagramInsights";
import {
  TrendingUp, Megaphone, MessageCircle, DollarSign,
  Users, BarChart2, ExternalLink, Heart, Instagram,
  ArrowUpDown, ChevronUp, ChevronDown, Mail,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  Cell, ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";

const TT = {
  contentStyle: {
    background: "hsl(240 20% 11%)",
    border: "1px solid hsl(240 15% 14%)",
    borderRadius: 10, fontSize: 11,
    color: "hsl(0 0% 96%)",
    minWidth: 130, padding: "8px 12px",
  },
  labelStyle: { color: "hsl(0 0% 96%)", fontWeight: 600, marginBottom: 2 },
  itemStyle:  { color: "hsl(0 0% 80%)" },
  cursor:     { fill: "hsl(0 0% 100% / 0.03)" },
};

const fmt = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1)+"M" : n >= 1000 ? (n/1000).toFixed(1)+"k" : String(Math.round(n));
const fmtFull = (n: number) => n.toLocaleString("pt-BR");
const brl = (n: number) => `R$ ${n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
const pct = (n: number) => n.toFixed(1) + "%";

const P  = "hsl(213 94% 55%)";
const P2 = "hsl(213 94% 55% / 0.5)";
const MUTED = "hsl(0 0% 60%)";

type Tab = "meta" | "wpp" | "instagram" | "email";
interface Props { from: string; to: string; }

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-3">
      {children}
    </p>
  );
}

const ACCOUNT_LABEL: Record<string, string> = {
  nexocommerce: "@nexocommerce",
  nexolab: "@nexolab",
};

type SortKey = "eng" | "like_count" | "comments_count" | "shares" | "saved" | "reach" | "views" | "taxaEng" | "posted_at";
type SortDir = "asc" | "desc";

export function MarketingSection({ from, to }: Props) {
  const [tab, setTab] = useState<Tab>("meta");
  const [igAccount, setIgAccount] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("eng");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAllPosts, setShowAllPosts] = useState(false);

  const { data: metaData = [], isLoading: loadingMeta } = useMetaAdsInsights(from, to);
  const { data: wppData,        isLoading: loadingWpp  } = useWppCampanhasResumo(from, to);
  const { data: postsData = [], isLoading: loadingIG   } = useInstagramPostInsights(from, to);
  const { data: dailyData = []                          } = useInstagramAccountDaily(from, to);
  const { data: profileData = []                        } = useInstagramProfileDaily(from, to);

  // ── META ────────────────────────────────────────────────
  const metaTotais = useMemo(() => metaData.reduce(
    (a, r) => ({
      spend: a.spend + (r.spend||0), leads: a.leads + (r.leads||0),
      purchases: a.purchases + (r.purchases||0),
      purchase_value: a.purchase_value + (r.purchase_value||0),
      impressions: a.impressions + (r.impressions||0),
      clicks: a.clicks + (r.clicks||0),
      reach: (a.reach||0) + (r.reach||0),
    }),
    { spend:0, leads:0, purchases:0, purchase_value:0, impressions:0, clicks:0, reach:0 as number|null }
  ), [metaData]);

  const metaCPL  = metaTotais.leads > 0 ? metaTotais.spend / metaTotais.leads : 0;
  const metaROAS = metaTotais.spend > 0 ? metaTotais.purchase_value / metaTotais.spend : 0;

  const porCampanha = useMemo(() => {
    const m: Record<string, { name: string; spend: number; leads: number; purchases: number; purchase_value: number; clicks: number; impressions: number }> = {};
    metaData.forEach(r => {
      if (!m[r.campaign_id]) m[r.campaign_id] = { name: r.campaign_name, spend:0, leads:0, purchases:0, purchase_value:0, clicks:0, impressions:0 };
      m[r.campaign_id].spend          += r.spend||0;
      m[r.campaign_id].leads          += r.leads||0;
      m[r.campaign_id].purchases      += r.purchases||0;
      m[r.campaign_id].purchase_value += r.purchase_value||0;
      m[r.campaign_id].clicks         += r.clicks||0;
      m[r.campaign_id].impressions    += r.impressions||0;
    });
    return Object.values(m).sort((a,b) => b.spend - a.spend);
  }, [metaData]);

  const metaChartData = porCampanha.slice(0,6).map(c => ({
    name: c.name.length > 20 ? c.name.slice(0,18)+"…" : c.name,
    Investido: parseFloat(c.spend.toFixed(2)),
    Leads: c.leads,
  }));

  // Meta — métricas extras
  const metaCTR      = metaTotais.impressions > 0 ? (metaTotais.clicks / metaTotais.impressions) * 100 : 0;
  const metaCPC      = metaTotais.clicks > 0 ? metaTotais.spend / metaTotais.clicks : 0;
  const metaFreqMedia = metaTotais.reach && metaTotais.reach > 0 ? metaTotais.impressions / metaTotais.reach : 0;

  // Tendência diária — agrupa por date_start
  const metaTendencia = useMemo(() => {
    const byDay: Record<string, { date: string; spend: number; leads: number; impressions: number; clicks: number }> = {};
    metaData.forEach(r => {
      const d = r.date_start;
      if (!byDay[d]) byDay[d] = { date: d, spend: 0, leads: 0, impressions: 0, clicks: 0 };
      byDay[d].spend       += r.spend || 0;
      byDay[d].leads       += r.leads || 0;
      byDay[d].impressions += r.impressions || 0;
      byDay[d].clicks      += r.clicks || 0;
    });
    return Object.values(byDay).sort((a,b) => a.date.localeCompare(b.date)).map(d => ({
      ...d,
      ctr: d.impressions > 0 ? parseFloat(((d.clicks/d.impressions)*100).toFixed(2)) : 0,
      cpl: d.leads > 0 ? parseFloat((d.spend/d.leads).toFixed(2)) : 0,
      date: d.date.slice(5), // "MM-DD"
    }));
  }, [metaData]);

  // Por campanha enriquecido com CTR e badge
  const porCampanhaRich = useMemo(() => porCampanha.map(c => {
    const cpl  = c.leads > 0 ? c.spend / c.leads : 0;
    const roas = c.spend > 0 ? c.purchase_value / c.spend : 0;
    const ctr  = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
    // badge baseado em ROAS e CPL
    const badge = roas >= 4 ? "Ótimo" : roas >= 2 ? "Bom" : cpl > 0 && cpl < 50 ? "Regular" : "—";
    const badgeColor = badge === "Ótimo" ? "text-emerald-400 bg-emerald-500/10"
      : badge === "Bom" ? "text-sky-400 bg-sky-500/10"
      : badge === "Regular" ? "text-amber-400 bg-amber-500/10"
      : "text-muted-foreground/40 bg-muted/10";
    return { ...c, cpl, roas, ctr, badge, badgeColor };
  }), [porCampanha]);

  // Meta análise IA
  const [metaAnalise, setMetaAnalise] = useState<string>("");
  const [metaAnaliseLoading, setMetaAnaliseLoading] = useState(false);

  async function gerarAnalyseMeta() {
    setMetaAnaliseLoading(true);
    setMetaAnalise("");
    try {
      const topC = porCampanhaRich[0];
      const prompt = `Você é um analista de tráfego pago especialista em performance digital para o mercado brasileiro de educação e consultoria B2B.

A empresa é a Nexo Commerce — oferece programas, imersões e consultorias de growth e performance para negócios digitais (e-commerce e infoprodutos). O público-alvo são empresários e gestores de marketing/vendas.

Dados do período — Meta Ads:
- Investido total: R$ ${metaTotais.spend.toLocaleString("pt-BR",{maximumFractionDigits:0})}
- Leads: ${metaTotais.leads} | CPL médio: R$ ${metaCPL.toFixed(0)}
- Compras: ${metaTotais.purchases} | Receita: R$ ${metaTotais.purchase_value.toLocaleString("pt-BR",{maximumFractionDigits:0})}
- ROAS: ${metaROAS.toFixed(2)}× | CTR: ${metaCTR.toFixed(2)}% | CPC: R$ ${metaCPC.toFixed(2)}
- Impressões: ${fmt(metaTotais.impressions)} | Alcance: ${fmt(metaTotais.reach ?? 0)} | Frequência média: ${metaFreqMedia.toFixed(1)}×
- Melhor campanha: ${topC?.name ?? "—"} (ROAS ${topC?.roas?.toFixed(1) ?? "—"}×, CPL R$ ${topC?.cpl?.toFixed(0) ?? "—"})
- Total de campanhas ativas: ${porCampanha.length}

Responda em 4 seções curtas (máx. 2 frases cada), sem emoji, sem markdown, só texto limpo:

**Desempenho geral**
[avalie o ROAS, CPL e CTR em relação a benchmarks do segmento]

**Pontos de atenção**
[identifique gargalos: frequência alta, CTR baixo, custo crescente, etc.]

**Oportunidade**
[uma ação concreta de otimização baseada nos dados]

**Próximo passo**
[recomendação tática imediata]`;

      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      const texto = data.content?.find((b: any) => b.type === "text")?.text ?? "";
      setMetaAnalise(texto);
    } catch {
      setMetaAnalise("Erro ao gerar análise. Tente novamente.");
    } finally {
      setMetaAnaliseLoading(false);
    }
  }

  // ── WPP ─────────────────────────────────────────────────
  const wppTotais    = wppData?.totais;
  const wppCampanhas = wppData?.campanhas ?? [];

  // ── INSTAGRAM ────────────────────────────────────────────
  // Filtro de conta aplicado em TODOS os dados
  const igAccounts = useMemo(() => [...new Set(dailyData.map(d => d.username))], [dailyData]);

  const postsFiltered = useMemo(() =>
    igAccount ? postsData.filter(p => p.username === igAccount) : postsData
  , [postsData, igAccount]);

  const dailyFiltered = useMemo(() =>
    igAccount ? dailyData.filter(d => d.username === igAccount) : dailyData
  , [dailyData, igAccount]);

  const profileFiltered = useMemo(() =>
    igAccount ? profileData.filter(d => d.username === igAccount) : profileData
  , [profileData, igAccount]);

  // Seguidores — delta correto: último snapshot - primeiro snapshot por conta
  const followersByAccount = useMemo(() => {
    const map: Record<string, { first: number; last: number; dates: string[] }> = {};
    dailyFiltered.forEach(d => {
      if (!map[d.username]) map[d.username] = { first: d.followers_count, last: d.followers_count, dates: [] };
      map[d.username].dates.push(d.date);
      if (d.date < map[d.username].dates[0]) map[d.username].first = d.followers_count;
      if (d.date > map[d.username].dates[map[d.username].dates.length - 1]) map[d.username].last = d.followers_count;
    });
    // Reprocessar em ordem
    const result: Record<string, { first: number; last: number }> = {};
    const sorted: Record<string, { date: string; count: number }[]> = {};
    dailyFiltered.forEach(d => {
      if (!sorted[d.username]) sorted[d.username] = [];
      sorted[d.username].push({ date: d.date, count: d.followers_count });
    });
    Object.entries(sorted).forEach(([acc, rows]) => {
      const s = rows.sort((a,b) => a.date.localeCompare(b.date));
      result[acc] = { first: s[0].count, last: s[s.length-1].count };
    });
    return result;
  }, [dailyFiltered]);

  // Seguidores ao longo do tempo — respeita filtro de conta
  const followersChart = useMemo(() => {
    const byDate: Record<string, Record<string,number>> = {};
    dailyFiltered.forEach(d => {
      if (!byDate[d.date]) byDate[d.date] = {};
      byDate[d.date][d.username] = d.followers_count;
    });
    return Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }, [dailyFiltered]);

  // Profile views — respeita filtro
  const profileChart = useMemo(() => {
    const byDate: Record<string, Record<string,number>> = {};
    profileFiltered.forEach(d => {
      if (!byDate[d.date]) byDate[d.date] = {};
      byDate[d.date][d.username + '_views']  = d.profile_views;
      byDate[d.date][d.username + '_clicks'] = d.website_clicks;
    });
    return Object.entries(byDate).sort(([a],[b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }, [profileFiltered]);

  const totalProfileViews  = profileFiltered.reduce((s,d) => s + d.profile_views,   0);
  const totalWebsiteClicks = profileFiltered.reduce((s,d) => s + d.website_clicks,  0);

  // Contas visíveis no gráfico (respeita filtro)
  const visibleAccounts = useMemo(() =>
    igAccount ? [igAccount] : igAccounts
  , [igAccount, igAccounts]);

  // Alcance vs Seguidores
  const alcanceVsSeguidores = useMemo(() => {
    const weekMap: Record<string, { reach: number; posts: number; followers: number }> = {};
    postsFiltered.forEach(p => {
      const d = new Date(p.posted_at);
      const ws = new Date(d); ws.setDate(d.getDate() - d.getDay());
      const wk = ws.toISOString().split("T")[0];
      if (!weekMap[wk]) weekMap[wk] = { reach: 0, posts: 0, followers: 0 };
      weekMap[wk].reach += p.reach;
      weekMap[wk].posts++;
    });
    dailyFiltered.forEach(d => {
      const dt = new Date(d.date);
      const ws = new Date(dt); ws.setDate(dt.getDate() - dt.getDay());
      const wk = ws.toISOString().split("T")[0];
      if (weekMap[wk]) weekMap[wk].followers = Math.max(weekMap[wk].followers, d.followers_count);
    });
    return Object.entries(weekMap).sort(([a],[b]) => a.localeCompare(b)).map(([, v], i) => ({
      semana: `Sem ${i+1}`,
      alcancePorPost: v.posts > 0 ? Math.round(v.reach / v.posts) : 0,
      pctSeguidores: v.followers > 0 ? parseFloat(((v.reach / v.posts / v.followers) * 100).toFixed(1)) : 0,
    }));
  }, [postsFiltered, dailyFiltered]);

  // Benchmark ER
  const erBenchmark = useMemo(() => {
    const faixas = { excelente: 0, bom: 0, medio: 0, baixo: 0 };
    postsFiltered.forEach(p => {
      const er = p.reach > 0 ? (p.like_count + p.comments_count + p.shares + p.saved) / p.reach * 100 : 0;
      if (er >= 5) faixas.excelente++;
      else if (er >= 3) faixas.bom++;
      else if (er >= 1) faixas.medio++;
      else faixas.baixo++;
    });
    return [
      { faixa: '>5% Excelente', posts: faixas.excelente, color: '#4CAF87' },
      { faixa: '3–5% Bom',      posts: faixas.bom,       color: P        },
      { faixa: '1–3% Médio',    posts: faixas.medio,     color: P2       },
      { faixa: '<1% Baixo',     posts: faixas.baixo,     color: 'hsl(240 15% 25%)' },
    ];
  }, [postsFiltered]);

  // KPIs Instagram
  const igEngTotal = postsFiltered.reduce((s,p) => s + p.like_count + p.comments_count + p.shares + p.saved, 0);
  const igAlcance  = postsFiltered.reduce((s,p) => s + p.reach, 0);
  const igViews    = postsFiltered.reduce((s,p) => s + (p.views||0), 0);
  const igTaxaEng  = igAlcance > 0 ? (igEngTotal / igAlcance) * 100 : 0;
  const igEngPost  = postsFiltered.length > 0 ? igEngTotal / postsFiltered.length : 0;

  // Por formato
  const porFormato = useMemo(() => {
    const m: Record<string,{posts:number;eng:number;reach:number}> = {};
    postsFiltered.forEach(p => {
      const t = p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Imagem";
      if (!m[t]) m[t] = {posts:0,eng:0,reach:0};
      m[t].posts++; m[t].eng += p.like_count+p.comments_count+p.shares+p.saved; m[t].reach += p.reach;
    });
    const total = Object.values(m).reduce((s,v) => s + v.eng, 0);
    return Object.entries(m).map(([tipo,v]) => ({
      tipo, posts: v.posts,
      engPorPost: v.posts > 0 ? Math.round(v.eng/v.posts) : 0,
      alcancePorPost: v.posts > 0 ? Math.round(v.reach/v.posts) : 0,
      taxaEng: v.reach > 0 ? parseFloat(((v.eng/v.reach)*100).toFixed(1)) : 0,
      share: total > 0 ? Math.round((v.eng/total)*100) : 0,
    })).sort((a,b) => b.engPorPost - a.engPorPost);
  }, [postsFiltered]);

  // Melhor horário
  const horarioData = useMemo(() => {
    const m: Record<number,{eng:number;posts:number}> = {};
    postsFiltered.forEach(p => {
      const h = new Date(p.posted_at).getHours();
      if (!m[h]) m[h] = {eng:0,posts:0};
      m[h].eng += p.like_count+p.comments_count+p.shares+p.saved;
      m[h].posts++;
    });
    return Array.from({length:24},(_,h) => ({
      hora: `${String(h).padStart(2,"0")}h`,
      engMedio: m[h] ? Math.round(m[h].eng/m[h].posts) : 0,
      posts: m[h]?.posts ?? 0,
    })).filter(d => d.posts > 0);
  }, [postsFiltered]);

  const maxHorario = Math.max(...horarioData.map(d => d.engMedio), 1);

  // Frequência semanal
  const weeklyData = useMemo(() => {
    const m: Record<string,{posts:number;eng:number}> = {};
    postsFiltered.forEach(p => {
      const d = new Date(p.posted_at);
      const ws = new Date(d); ws.setDate(d.getDate()-d.getDay());
      const wk = ws.toISOString().split("T")[0];
      if (!m[wk]) m[wk] = {posts:0,eng:0};
      m[wk].posts++;
      m[wk].eng += p.like_count+p.comments_count+p.shares+p.saved;
    });
    return Object.entries(m).sort(([a],[b]) => a.localeCompare(b)).map(([,v],i) => ({
      semana: `Sem ${i+1}`,
      posts: v.posts,
      engPorPost: v.posts > 0 ? Math.round(v.eng/v.posts) : 0,
    }));
  }, [postsFiltered]);

  // Hashtags
  const hashtagData = useMemo(() => {
    const m: Record<string,number> = {};
    postsFiltered.forEach(p => {
      (p.caption||"").match(/#[\w\u00C0-\u024F]+/gi)?.forEach(t => {
        m[t.toLowerCase()] = (m[t.toLowerCase()]||0)+1;
      });
    });
    return Object.entries(m).sort(([,a],[,b]) => b-a).slice(0,15).map(([tag,count]) => ({tag,count}));
  }, [postsFiltered]);

  // Tabela de posts — ordenável, todos os posts
  const allPostsWithMetrics = useMemo(() => [...postsFiltered]
    .map(p => ({
      ...p,
      eng: p.like_count + p.comments_count + p.shares + p.saved,
      taxaEng: p.reach > 0 ? (p.like_count + p.comments_count + p.shares + p.saved) / p.reach * 100 : 0,
    })), [postsFiltered]);

  const sortedPosts = useMemo(() => {
    const sorted = [...allPostsWithMetrics].sort((a, b) => {
      const va = sortKey === "posted_at" ? new Date(a.posted_at).getTime() : (a as any)[sortKey] ?? 0;
      const vb = sortKey === "posted_at" ? new Date(b.posted_at).getTime() : (b as any)[sortKey] ?? 0;
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return showAllPosts ? sorted : sorted.slice(0, 10);
  }, [allPostsWithMetrics, sortKey, sortDir, showAllPosts]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ArrowUpDown className="inline h-2.5 w-2.5 ml-0.5 opacity-30"/>;
    return sortDir === "desc"
      ? <ChevronDown className="inline h-2.5 w-2.5 ml-0.5 text-primary"/>
      : <ChevronUp   className="inline h-2.5 w-2.5 ml-0.5 text-primary"/>;
  }

  // Previsibilidade de seguidores (regressão linear simples)
  const followersForecast = useMemo(() => {
    const rows = [...dailyFiltered].sort((a,b) => a.date.localeCompare(b.date));
    if (rows.length < 3) return null;
    // agrupa por conta — usa todos os dados do período
    const byAcc: Record<string, {x:number;y:number}[]> = {};
    rows.forEach((d, i) => {
      if (!byAcc[d.username]) byAcc[d.username] = [];
      byAcc[d.username].push({ x: i, y: d.followers_count });
    });
    const results: Record<string, { per_day: number; per_30: number; next_30: number }> = {};
    Object.entries(byAcc).forEach(([acc, pts]) => {
      const n = pts.length;
      const sumX = pts.reduce((s,p)=>s+p.x,0);
      const sumY = pts.reduce((s,p)=>s+p.y,0);
      const sumXY = pts.reduce((s,p)=>s+p.x*p.y,0);
      const sumX2 = pts.reduce((s,p)=>s+p.x*p.x,0);
      const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
      const lastY = pts[pts.length-1].y;
      results[acc] = {
        per_day: Math.round(slope),
        per_30:  Math.round(slope * 30),
        next_30: Math.round(lastY + slope * 30),
      };
    });
    return results;
  }, [dailyFiltered]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Marketing — Performance de Canais
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-border bg-card/40 w-fit">
        {([
          { key:"meta",      label:"Meta Ads",      Icon:Megaphone     },
          { key:"wpp",       label:"WPP Campanhas", Icon:MessageCircle },
          { key:"instagram", label:"Instagram",     Icon:Instagram     },
          { key:"email",     label:"E-mail",        Icon:Mail          },
        ] as {key:Tab;label:string;Icon:any}[]).map(({key,label,Icon}) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab===key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon className="h-3 w-3" />{label}
          </button>
        ))}
      </div>

      {/* ── META ADS ── */}
      {tab==="meta" && (
        <div className="space-y-4">

          {/* KPIs linha 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loadingMeta ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-[90px] rounded-xl"/>) : (<>
              <KPICard title="Investido (Ads)"
                value={`R$ ${metaTotais.spend.toLocaleString("pt-BR",{maximumFractionDigits:0})}`}
                subtitle="Total no período" icon={DollarSign}/>
              <KPICard title="Leads Gerados"
                value={metaTotais.leads.toLocaleString("pt-BR")}
                subtitle={`CPL R$ ${metaCPL.toFixed(0)}`}
                icon={Users}/>
              <KPICard title="Compras (Meta)"
                value={metaTotais.purchases.toLocaleString("pt-BR")}
                subtitle={`R$ ${metaTotais.purchase_value.toLocaleString("pt-BR",{maximumFractionDigits:0})} receita`}
                icon={BarChart2}/>
              <KPICard title="ROAS"
                value={`${metaROAS.toFixed(2)}×`}
                subtitle={`${fmt(metaTotais.impressions)} impressões`}
                icon={TrendingUp} accent={metaROAS>=3?"gold":"red"}/>
            </>)}
          </div>

          {/* KPIs linha 2 — CTR / CPC / Alcance / Frequência */}
          {!loadingMeta && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard title="CTR"
                value={`${metaCTR.toFixed(2)}%`}
                subtitle="cliques ÷ impressões"
                icon={TrendingUp} accent={metaCTR>=1?"gold":"red"}/>
              <KPICard title="CPC"
                value={`R$ ${metaCPC.toFixed(2)}`}
                subtitle="custo por clique"
                icon={DollarSign}/>
              <KPICard title="Alcance"
                value={fmt(metaTotais.reach ?? 0)}
                subtitle="pessoas únicas"
                icon={Users}/>
              <KPICard title="Frequência"
                value={`${metaFreqMedia.toFixed(1)}×`}
                subtitle="impressões ÷ alcance"
                icon={BarChart2} accent={metaFreqMedia>3?"red":undefined}/>
            </div>
          )}

          {/* Tendência diária */}
          {!loadingMeta && metaTendencia.length > 1 && (
            <GlassCard>
              <SubTitle>Tendência diária — Investido, Leads e CTR</SubTitle>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={metaTendencia} margin={{left:0,right:16}}>
                  <XAxis dataKey="date" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                  <YAxis yAxisId="brl" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}
                    tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                  <YAxis yAxisId="leads" orientation="right" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip {...TT} formatter={(v:number,name:string) =>
                    name==="Investido" ? `R$ ${v.toLocaleString("pt-BR")}` :
                    name==="CTR" ? `${v}%` : v}/>
                  <Legend wrapperStyle={{fontSize:11,color:MUTED}}/>
                  <Line yAxisId="brl"   type="monotone" dataKey="spend"  name="Investido"
                    stroke={P}  strokeWidth={2} dot={false}/>
                  <Line yAxisId="leads" type="monotone" dataKey="leads"  name="Leads"
                    stroke="hsl(210 70% 55%)" strokeWidth={2} dot={false}/>
                  <Line yAxisId="leads" type="monotone" dataKey="ctr"    name="CTR"
                    stroke="hsl(140 60% 45%)" strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {/* Gráfico Investido × Leads por campanha */}
          {!loadingMeta && metaChartData.length > 0 && (
            <GlassCard>
              <SubTitle>Investido × Leads por Campanha</SubTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={metaChartData} margin={{left:0,right:8}}>
                  <XAxis dataKey="name" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                  <YAxis yAxisId="left"  tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}
                    tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                  <Tooltip {...TT} formatter={(v:number,name:string) =>
                    name==="Investido" ? `R$ ${v.toLocaleString("pt-BR")}` : v}/>
                  <Legend wrapperStyle={{fontSize:11,color:MUTED}}/>
                  <Bar yAxisId="left"  dataKey="Investido" fill={P}  radius={[4,4,0,0]} opacity={0.85}/>
                  <Bar yAxisId="right" dataKey="Leads"     fill="hsl(210 70% 55%)" radius={[4,4,0,0]} opacity={0.7}/>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {/* Tabela enriquecida por campanha */}
          {!loadingMeta && porCampanhaRich.length > 0 && (
            <GlassCard>
              <SubTitle>Detalhamento por Campanha</SubTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Campanha","Investido","Leads","CPL","CTR","ROAS","Status"].map(h => (
                        <th key={h} className={cn("py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                          h==="Campanha"?"text-left pr-3":"text-right pr-3")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {porCampanhaRich.map((c,i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                        <td className="py-2 pr-3 font-medium text-foreground max-w-[180px] truncate">{c.name}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{brl(c.spend)}</td>
                        <td className="py-2 pr-3 text-right font-semibold text-foreground">{c.leads}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{c.cpl>0?brl(c.cpl):"—"}</td>
                        <td className={cn("py-2 pr-3 text-right",c.ctr>=1?"text-emerald-400":c.ctr>0?"text-amber-400":"text-muted-foreground/40")}>
                          {c.ctr>0?`${c.ctr.toFixed(2)}%`:"—"}</td>
                        <td className={cn("py-2 pr-3 text-right font-semibold",
                          c.roas>=4?"text-emerald-400":c.roas>=2?"text-sky-400":c.roas>0?"text-amber-400":"text-muted-foreground/40")}>
                          {c.roas>0?`${c.roas.toFixed(1)}×`:"—"}</td>
                        <td className="py-2 pr-3 text-right">
                          <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-semibold", c.badgeColor)}>
                            {c.badge}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Análise IA */}
          {!loadingMeta && metaTotais.spend > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-3">
                <SubTitle>Análise & Insights — Meta Ads</SubTitle>
                <button
                  onClick={gerarAnalyseMeta}
                  disabled={metaAnaliseLoading}
                  className="text-[10px] font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all">
                  {metaAnaliseLoading ? "Analisando…" : "+ Gerar análise"}
                </button>
              </div>
              {metaAnalise ? (
                <div className="space-y-3">
                  {metaAnalise.split("\n\n").filter(Boolean).map((bloco, i) => {
                    const lines = bloco.split("\n");
                    const titulo = lines[0].replace(/\*\*/g,"").trim();
                    const corpo  = lines.slice(1).join(" ").trim();
                    return (
                      <div key={i} className="border-l-2 border-primary/40 pl-3">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-primary/70 mb-0.5">{titulo}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{corpo}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/60">
                  {metaAnaliseLoading ? "Interpretando dados com IA…" : "Clique em \"Gerar análise\" para interpretar os dados do período com IA."}
                </p>
              )}
            </GlassCard>
          )}

          {!loadingMeta && metaData.length===0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Sem dados do Meta Ads no período.
            </div>
          )}
        </div>
      )}

      {/* ── WPP ── */}
      {tab==="wpp" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {loadingWpp ? Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-[90px] rounded-xl"/>) : (<>
              <KPICard title="Campanhas"  value={wppTotais?.campanhas??0}     subtitle="Disparadas no período" icon={MessageCircle}/>
              <KPICard title="Enviadas"   value={fmt(wppTotais?.enviadas??0)}  subtitle={`${(wppTotais?.taxaEntrega??0).toFixed(1)}% entrega`} icon={DollarSign}/>
              <KPICard title="Entregues"  value={fmt(wppTotais?.entregues??0)} icon={CheckCheck}/>
              <KPICard title="Lidas"      value={fmt(wppTotais?.lidas??0)}     subtitle={`${(wppTotais?.taxaLeitura??0).toFixed(1)}% leitura`} icon={Eye} accent={(wppTotais?.taxaLeitura??0)>=50?"gold":"red"}/>
            </>)}
          </div>
          {!loadingWpp && wppCampanhas.length>0 && (
            <GlassCard>
              <SubTitle>Campanhas WPP — Detalhamento</SubTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Campanha","Enviadas","Entregues","Lidas","% Leitura","Falhas","Status"].map(h=>(
                        <th key={h} className={cn("py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                          h==="Campanha"?"text-left pr-3":"text-right pr-3")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {wppCampanhas.map(c => {
                      const tl = c.entregues>0?(c.lidos/c.entregues)*100:0;
                      return (
                        <tr key={c.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                          <td className="py-2 pr-3 font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{c.total_envios.toLocaleString("pt-BR")}</td>
                          <td className="py-2 pr-3 text-right text-muted-foreground">{c.entregues.toLocaleString("pt-BR")}</td>
                          <td className="py-2 pr-3 text-right font-semibold text-foreground">{c.lidos.toLocaleString("pt-BR")}</td>
                          <td className={cn("py-2 pr-3 text-right font-semibold",tl>=50?"text-emerald-400":tl>0?"text-amber-400":"text-muted-foreground/40")}>
                            {tl>0?pct(tl):"—"}</td>
                          <td className={cn("py-2 pr-3 text-right",c.falhas>0?"text-destructive":"text-muted-foreground/40")}>
                            {c.falhas>0?c.falhas:"—"}</td>
                          <td className="py-2 pr-3 text-right">
                            <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-semibold",
                              c.status==="completed"?"bg-emerald-500/10 text-emerald-400":
                              c.status==="firing"?"bg-primary/10 text-primary":"bg-muted text-muted-foreground")}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
          {!loadingWpp && wppCampanhas.length===0 && (
            <div className="text-center text-muted-foreground text-sm py-8">Nenhuma campanha WPP no período.</div>
          )}
        </div>
      )}

      {/* ── EMAIL MARKETING ── */}
      {tab==="email" && (
        <EmailMarketingSection from={from} to={to} />
      )}

      {/* ── INSTAGRAM ── */}
      {tab==="instagram" && (
        <div className="space-y-4">

          {/* Filtro de conta */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Conta:</span>
            <div className="flex gap-1 p-0.5 rounded-lg border border-border bg-card/40">
              {([null, "nexocommerce", "nexolab"] as (string|null)[]).map(acc => (
                <button key={acc??"todas"} onClick={() => setIgAccount(acc)}
                  className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all",
                    igAccount===acc
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}>
                  {acc===null?"Todas":acc==="nexocommerce"?"@NC":"@NL"}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          {!igAccount ? (() => {
            // ── modo TODAS: total + EC + CS + Posts em grid 4 colunas
            const fEC = followersByAccount["nexocommerce"];
            const fCS = followersByAccount["nexolab"];
            const totalSeg = (fEC?.last ?? 0) + (fCS?.last ?? 0);
            const totalDelta = ((fEC ? fEC.last - fEC.first : 0) + (fCS ? fCS.last - fCS.first : 0));
            const gainedEC = dailyData.filter(d => d.username==="nexocommerce").reduce((s,d)=>s+(d.followers_gained||0),0);
            const lostEC   = dailyData.filter(d => d.username==="nexocommerce").reduce((s,d)=>s+(d.followers_lost||0),0);
            const gainedCS = dailyData.filter(d => d.username==="nexolab").reduce((s,d)=>s+(d.followers_gained||0),0);
            const lostCS   = dailyData.filter(d => d.username==="nexolab").reduce((s,d)=>s+(d.followers_lost||0),0);
            return (
              <>
                {/* linha 1: total + posts + eng + taxa */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KPICard title="Total de seguidores"
                    value={fmt(totalSeg)}
                    subtitle={`${totalDelta>=0?"+":""}${totalDelta.toLocaleString("pt-BR")} líquido no período`}
                    icon={Users}/>
                  <KPICard title="Posts no período" value={postsFiltered.length}
                    subtitle={`Eng. médio: ${fmt(igEngPost)}/post`} icon={TrendingUp}/>
                  <KPICard title="Engajamento total" value={fmt(igEngTotal)}
                    subtitle={`${fmt(igAlcance)} alcance`} icon={Heart}/>
                  <KPICard title="Taxa de engajamento" value={pct(igTaxaEng)}
                    subtitle="eng ÷ alcance × 100" icon={TrendingUp} accent="gold"/>
                </div>
                {/* linha 2: EC | CS | views */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <KPICard title="Seguidores @NC"
                    value={fmtFull(fEC?.last ?? 0)}
                    subtitle={`${(fEC ? fEC.last-fEC.first : 0)>=0?"+":""}${(fEC ? fEC.last-fEC.first : 0).toLocaleString("pt-BR")} líquido · ↑${gainedEC} ↓${lostEC}`}
                    icon={Users}/>
                  <KPICard title="Seguidores @NL"
                    value={fmtFull(fCS?.last ?? 0)}
                    subtitle={`${(fCS ? fCS.last-fCS.first : 0)>=0?"+":""}${(fCS ? fCS.last-fCS.first : 0).toLocaleString("pt-BR")} líquido · ↑${gainedCS} ↓${lostCS}`}
                    icon={Users}/>
                  <KPICard title="Views totais" value={fmt(igViews)}
                    subtitle="Reels e vídeos" icon={Eye}/>
                </div>
              </>
            );
          })() : (() => {
            // ── modo conta única: layout original
            const f = followersByAccount[igAccount];
            const delta = f ? f.last - f.first : 0;
            const gained = dailyFiltered.filter(d => d.username===igAccount).reduce((s,d)=>s+(d.followers_gained||0),0);
            const lost   = dailyFiltered.filter(d => d.username===igAccount).reduce((s,d)=>s+(d.followers_lost||0),0);
            const label  = igAccount==="nexocommerce" ? "@NC" : "@NL";
            return (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <KPICard title={`Seguidores ${label}`}
                    value={fmtFull(f?.last ?? 0)}
                    subtitle={`${delta>=0?"+":""}${delta.toLocaleString("pt-BR")} líquido · ↑${gained} ↓${lost}`}
                    icon={Users}/>
                  <KPICard title="Crescimento líquido"
                    value={`${delta>=0?"+":""}${delta.toLocaleString("pt-BR")}`}
                    subtitle="no período selecionado" icon={TrendingUp}/>
                  <KPICard title="Posts no período" value={postsFiltered.length}
                    subtitle={`Eng. médio: ${fmt(igEngPost)}/post`} icon={TrendingUp}/>
                  <KPICard title="Engajamento total" value={fmt(igEngTotal)}
                    subtitle={`${fmt(igAlcance)} alcance`} icon={Heart}/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <KPICard title="Taxa de engajamento" value={pct(igTaxaEng)}
                    subtitle="eng ÷ alcance × 100" icon={TrendingUp} accent="gold"/>
                  <KPICard title="Views totais" value={fmt(igViews)}
                    subtitle="Reels e vídeos" icon={Eye}/>
                </div>
              </>
            );
          })()}
          {/* Crescimento de seguidores com previsibilidade */}
          {followersChart.length > 0 && (
            <GlassCard>
              <SubTitle>Crescimento de seguidores</SubTitle>
              {followersChart.length > 1 ? (() => {
                // Domínio Y: pad proporcional dentro de cada série (não entre séries)
                const valsByAcc = visibleAccounts.map(acc =>
                  followersChart.map(d => (d as any)[acc] ?? null).filter((v): v is number => v !== null)
                );
                const serieRanges = valsByAcc.map(vals => ({
                  min: Math.min(...vals), max: Math.max(...vals),
                }));
                const globalMin = Math.min(...serieRanges.map(r => r.min));
                const globalMax = Math.max(...serieRanges.map(r => r.max));
                // pad = 20% da maior variação intra-série (evita linha reta), mín 100
                const maxIntraRange = Math.max(...serieRanges.map(r => r.max - r.min), 100);
                const pad = Math.max(Math.round(maxIntraRange * 0.2), 100);
                return (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={followersChart}>
                      <defs>
                        <linearGradient id="igGradEC" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={P}  stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={P}  stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="igGradCS" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={P2} stopOpacity={0.5}/>
                          <stop offset="95%" stopColor={P2} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                      <YAxis domain={[globalMin - pad, globalMax + pad]} tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmt}/>
                      <Tooltip {...TT} formatter={(v:number) => fmt(v)}/>
                      <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,color:MUTED}}/>
                      {visibleAccounts.map((acc,i) => (
                        <Area key={acc} type="monotone" dataKey={acc}
                          name={ACCOUNT_LABEL[acc]??acc}
                          stroke={i===0?P:P2} strokeWidth={2}
                          fill={i===0?"url(#igGradEC)":"url(#igGradCS)"} dot={true}/>
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                );
              })() : (
                <p className="text-[11px] text-muted-foreground py-4">
                  Dados insuficientes para o gráfico — acumula a partir do segundo dia de sync.
                </p>
              )}

              {/* Crescimento detalhado por conta */}
              {dailyFiltered.some(d => d.followers_gained > 0 || d.followers_lost > 0) && (
                <div className="mt-4 pt-3 border-t border-border/40">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                    Crescimento no período
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {visibleAccounts.map(acc => {
                      const gained = dailyFiltered.filter(d => d.username === acc).reduce((s,d) => s + (d.followers_gained||0), 0);
                      const lost   = dailyFiltered.filter(d => d.username === acc).reduce((s,d) => s + (d.followers_lost||0),   0);
                      const net    = gained - lost;
                      return (
                        <div key={acc} className="rounded-lg p-3 bg-muted/10 border border-border/30">
                          <p className="text-[10px] font-semibold text-primary mb-2">
                            {acc==="nexocommerce"?"@NC":"@NL"}
                          </p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Novos seguidores</span>
                              <span className="font-semibold text-emerald-400">+{gained.toLocaleString("pt-BR")}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Deixaram de seguir</span>
                              <span className="font-semibold text-destructive">-{lost.toLocaleString("pt-BR")}</span>
                            </div>
                            <div className="flex justify-between text-[10px] pt-1 border-t border-border/30">
                              <span className="text-muted-foreground font-semibold">Líquido</span>
                              <span className={cn("font-bold", net>=0?"text-emerald-400":"text-destructive")}>
                                {net>=0?"+":""}{net.toLocaleString("pt-BR")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Previsibilidade */}
              {followersForecast && (
                <div className="mt-4 pt-3 border-t border-border/40">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2">
                    Previsão (regressão linear no período)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {visibleAccounts.map(acc => {
                      const f = followersForecast[acc];
                      if (!f) return null;
                      return (
                        <div key={acc} className="rounded-lg p-3 bg-muted/10 border border-border/30">
                          <p className="text-[10px] font-semibold text-primary mb-1">
                            {acc==="nexocommerce"?"@NC":"@NL"}
                          </p>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Média diária</span>
                              <span className={cn("font-semibold", f.per_day>=0?"text-emerald-400":"text-destructive")}>
                                {f.per_day>=0?"+":""}{f.per_day}/dia
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Próximos 30 dias</span>
                              <span className={cn("font-semibold", f.per_30>=0?"text-emerald-400":"text-destructive")}>
                                {f.per_30>=0?"+":""}{f.per_30.toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground">Previsão em 30d</span>
                              <span className="font-bold text-foreground">{fmt(f.next_30)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>
          )}

          {/* Frequência semanal + Melhor horário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weeklyData.length > 0 && (
              <GlassCard>
                <SubTitle>Frequência semanal vs engajamento médio</SubTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyData} barGap={4} barCategoryGap="35%">
                    <XAxis dataKey="semana" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <YAxis yAxisId="left"  tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <YAxis yAxisId="right" orientation="right" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <Tooltip {...TT}/>
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,color:MUTED}}/>
                    <Bar yAxisId="left"  dataKey="posts"      name="Posts"    fill={P2} radius={[4,4,0,0]}/>
                    <Bar yAxisId="right" dataKey="engPorPost" name="Eng/post" fill={P}  radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            )}

            {horarioData.length > 0 && (
              <GlassCard>
                <SubTitle>Melhor horário para postar</SubTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={horarioData} barCategoryGap="25%">
                    <XAxis dataKey="hora" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmt}/>
                    <Tooltip {...TT} formatter={(v:number) => [`${v}`, "Eng. médio"]}/>
                    <Bar dataKey="engMedio" name="Eng. médio" radius={[4,4,0,0]}>
                      {horarioData.map(d => (
                        <Cell key={d.hora} fill={`hsl(213 94% 55% / ${(0.3 + (d.engMedio/maxHorario)*0.7).toFixed(2)})`}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Melhor horário: <span className="text-foreground font-semibold">
                    {[...horarioData].sort((a,b)=>b.engMedio-a.engMedio)[0]?.hora}
                  </span> — {fmt(Math.max(...horarioData.map(d=>d.engMedio)))} eng. médio
                </p>
              </GlassCard>
            )}
          </div>

          {/* Performance por formato */}
          {porFormato.length > 0 && (
            <GlassCard>
              <SubTitle>Performance por formato de conteúdo</SubTitle>
              <div className={cn(
                "grid gap-6",
                porFormato.length === 1 ? "grid-cols-1" :
                porFormato.length === 2 ? "grid-cols-2" : "grid-cols-3"
              )}>
                {porFormato.map(f => (
                  <div key={f.tipo} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{f.tipo}</span>
                      <span className="text-[10px] text-muted-foreground">{f.posts} post{f.posts!==1?"s":""}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Eng. por post</span>
                          <span className="text-foreground font-semibold">{fmt(f.engPorPost)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30">
                          <div className="h-1.5 rounded-full bg-primary transition-all" style={{width:`${f.share}%`}}/>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">Alcance por post</span>
                          <span className="text-foreground font-semibold">{fmt(f.alcancePorPost)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/30">
                          <div className="h-1.5 rounded-full bg-primary/50 transition-all"
                            style={{width:`${Math.min(f.taxaEng*10,100)}%`}}/>
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-muted-foreground">Taxa de engajamento</span>
                        <span className={cn("font-semibold", f.taxaEng>3?"text-emerald-400":"text-muted-foreground")}>
                          {pct(f.taxaEng)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Profile views + Alcance vs Seguidores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profileChart.length > 0 && (
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <SubTitle>Visitas ao perfil & cliques no link</SubTitle>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>👁 <span className="text-foreground font-semibold">{fmt(totalProfileViews)}</span> visitas</span>
                    <span>🔗 <span className="text-foreground font-semibold">{fmt(totalWebsiteClicks)}</span> cliques</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={profileChart}>
                    <defs>
                      <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={P}  stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={P}  stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={P2} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={P2} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={fmt}/>
                    <Tooltip {...TT} formatter={(v:number) => fmt(v)}/>
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:11,color:MUTED}}/>
                    {visibleAccounts.map((acc,i) => (
                      <Area key={`${acc}_views`} type="monotone"
                        dataKey={`${acc}_views`}
                        name={`${acc==="nexocommerce"?"NC":"NL"} — visitas`}
                        stroke={i===0?P:P2} strokeWidth={2}
                        fill={i===0?"url(#gradViews)":"url(#gradClicks)"} dot={false}/>
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
            )}

            {alcanceVsSeguidores.length > 0 && (
              <GlassCard>
                <SubTitle>Alcance vs seguidores — % de novos públicos</SubTitle>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Quanto do alcance veio de pessoas que não te seguem (quanto maior, melhor distribuição do algoritmo)
                </p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={alcanceVsSeguidores} barCategoryGap="35%">
                    <XAxis dataKey="semana" tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fill:MUTED,fontSize:10}} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`}/>
                    <Tooltip {...TT} formatter={(v:number) => `${v}%`}/>
                    <Bar dataKey="pctSeguidores" name="% alcance vs seguidores" fill={P} radius={[4,4,0,0]}>
                      {alcanceVsSeguidores.map((_, i) => (
                        <Cell key={i} fill={`hsl(213 94% 55% / ${0.5 + i * 0.1})`}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            )}
          </div>

          {/* Benchmark ER */}
          {postsFiltered.length > 0 && (
            <GlassCard>
              <SubTitle>Benchmark de taxa de engajamento por post</SubTitle>
              <div className="grid grid-cols-4 gap-3">
                {erBenchmark.map(f => (
                  <div key={f.faixa} className="rounded-lg p-3 text-center"
                    style={{ background: `${f.color}12`, border: `1px solid ${f.color}25` }}>
                    <div className="font-display font-bold text-2xl text-foreground">{f.posts}</div>
                    <div className="text-[10px] font-semibold mt-1" style={{color: f.color}}>{f.faixa}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {postsFiltered.length > 0 ? Math.round(f.posts/postsFiltered.length*100) : 0}% dos posts
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Acima de 5% é considerado excelente · acima de 3% é bom · abaixo de 1% precisa atenção
              </p>
            </GlassCard>
          )}

          {/* Hashtags */}
          {hashtagData.length > 0 && (
            <GlassCard>
              <SubTitle>Hashtags mais usadas</SubTitle>
              <div className="flex flex-wrap gap-2">
                {hashtagData.map(h => {
                  const max   = hashtagData[0].count;
                  const ratio = h.count/max;
                  return (
                    <span key={h.tag}
                      className={cn("px-2.5 py-1 rounded-full border transition-colors", ratio>0.7?"text-xs":"text-[10px]")}
                      style={{
                        background:  `hsl(213 94% 55% / ${(0.05+ratio*0.15).toFixed(2)})`,
                        borderColor: `hsl(213 94% 55% / ${(0.15+ratio*0.25).toFixed(2)})`,
                        color: `hsl(0 0% ${55+ratio*41}%)`,
                        fontWeight: ratio>0.5?600:400,
                      }}>
                      {h.tag}<span className="ml-1 opacity-50 text-[9px]">×{h.count}</span>
                    </span>
                  );
                })}
              </div>
            </GlassCard>
          )}

          {/* Alertas fixos por lógica */}
          {postsFiltered.length > 0 && (
            <InstagramAlertas
              postsFiltered={postsFiltered}
              dailyFiltered={dailyFiltered}
              dailyData={dailyData}
              postsData={postsData}
              porFormato={porFormato}
              followersByAccount={followersByAccount}
              followersForecast={followersForecast}
              followersForecastAll={followersForecast}
              igTaxaEng={igTaxaEng}
              igAccount={igAccount}
            />
          )}

          {/* Impacto de conteúdo em seguidores */}
          {postsData.length > 0 && (
            <ImpactoConteudo
              postsData={postsData}
              dailyData={dailyData}
              igAccount={igAccount}
            />
          )}

          {/* Análise & Insights com Claude API */}
          {postsFiltered.length > 0 && (
            <InstagramInsightsAI
              postsFiltered={postsFiltered}
              dailyFiltered={dailyFiltered}
              porFormato={porFormato}
              horarioData={horarioData}
              igTaxaEng={igTaxaEng}
              igEngPost={igEngPost}
              erBenchmark={erBenchmark}
              igAccount={igAccount}
              followersByAccount={followersByAccount}
              followersForecast={followersForecast}
            />
          )}

          {/* Tabela de posts — ordenável, todos os posts */}
          {allPostsWithMetrics.length > 0 && (
            <GlassCard>
              <div className="flex items-center justify-between mb-3">
                <SubTitle>Posts do período</SubTitle>
                <span className="text-[10px] text-muted-foreground">{allPostsWithMetrics.length} posts</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {[
                        { label: "Conta",   key: null },
                        { label: "Data",    key: "posted_at" as SortKey },
                        { label: "Tipo",    key: null },
                        { label: "Caption", key: null },
                        { label: "❤️",      key: "like_count" as SortKey },
                        { label: "💬",      key: "comments_count" as SortKey },
                        { label: "🔁",      key: "shares" as SortKey },
                        { label: "🔖",      key: "saved" as SortKey },
                        { label: "Alcance", key: "reach" as SortKey },
                        { label: "Taxa Eng.", key: "taxaEng" as SortKey },
                        { label: "Eng. total", key: "eng" as SortKey },
                      ].map(({ label, key }) => (
                        <th key={label}
                          onClick={() => key && toggleSort(key)}
                          className={cn(
                            "py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60",
                            ["Conta","Data","Tipo","Caption"].includes(label) ? "text-left pr-3" : "text-right pr-3",
                            key ? "cursor-pointer hover:text-muted-foreground select-none" : ""
                          )}>
                          {label}{key && <SortIcon k={key}/>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPosts.map(p => (
                      <tr key={p.post_id} className="border-b border-border/40 hover:bg-muted/10 transition-colors">
                        <td className="py-2 pr-3">
                          <span className="text-[10px] font-semibold text-primary">
                            {p.username==="nexocommerce"?"@NC":"@NL"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">
                          {p.posted_at.split("T")[0]}
                        </td>
                        <td className="py-2 pr-3">
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Imagem"}
                          </span>
                        </td>
                        <td className="py-2 pr-3 max-w-[140px]">
                          <span className="block truncate text-[10px] text-foreground/70" title={p.caption}>
                            {p.caption?.slice(0,40)}{(p.caption?.length??0)>40?"…":""}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right text-[10px] font-mono text-muted-foreground">{fmt(p.like_count)}</td>
                        <td className="py-2 pr-3 text-right text-[10px] font-mono text-muted-foreground">{fmt(p.comments_count)}</td>
                        <td className="py-2 pr-3 text-right text-[10px] font-mono text-muted-foreground">{fmt(p.shares)}</td>
                        <td className="py-2 pr-3 text-right text-[10px] font-mono text-muted-foreground">{fmt(p.saved)}</td>
                        <td className="py-2 pr-3 text-right text-[10px] font-mono text-muted-foreground">{fmt(p.reach)}</td>
                        <td className="py-2 pr-3 text-right">
                          <span className={cn("text-[10px] font-semibold",
                            p.taxaEng>=5?"text-emerald-400":p.taxaEng>=3?"text-primary":"text-muted-foreground")}>
                            {pct(p.taxaEng)}
                          </span>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-display font-bold text-sm text-foreground">{fmt(p.eng)}</span>
                            <a href={p.permalink} target="_blank" rel="noopener noreferrer"
                              className="text-muted-foreground/40 hover:text-primary transition-colors">
                              <ExternalLink className="h-3 w-3"/>
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {allPostsWithMetrics.length > 10 && (
                <button onClick={() => setShowAllPosts(v => !v)}
                  className="mt-3 w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors py-2 border border-border/40 rounded-lg">
                  {showAllPosts
                    ? "Mostrar menos"
                    : `Ver todos os ${allPostsWithMetrics.length} posts`}
                </button>
              )}
            </GlassCard>
          )}

          {!loadingIG && postsFiltered.length===0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Nenhum post encontrado no período selecionado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckCheck(p:any){return<svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>;}
function Eye(p:any){return<svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.964-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>;}
function Send(p:any){return<svg {...p} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"/></svg>;}

// ── Alertas fixos por lógica (sem IA) ──────────────────────────────────────────
interface AlertasProps {
  postsFiltered: any[];
  dailyFiltered: any[];
  dailyData: any[];
  postsData: any[];
  porFormato: any[];
  followersByAccount: Record<string, {first:number;last:number}>;
  followersForecast: Record<string, {per_day:number;per_30:number;next_30:number}> | null;
  followersForecastAll: Record<string, {per_day:number;per_30:number;next_30:number}> | null;
  igTaxaEng: number;
  igAccount: string | null;
}

type NivelAlerta = "vermelho" | "amarelo" | "verde";

// Post-it — estilo compatível com o dashboard (dark, bordas sutis, fonte Inter)
function StickyCard({ nivel, label, numero, unidade, detalhe }: {
  nivel: NivelAlerta;
  label: string;
  numero: string;
  unidade?: string;
  detalhe: string;
}) {
  const estilos = {
    vermelho: {
      bg:     "bg-red-500/5",
      border: "border-l-2 border-l-red-500/60 border border-border/40",
      num:    "text-red-400",
      badge:  "bg-red-500/15 text-red-400",
      detalhe:"text-red-300/60",
    },
    amarelo: {
      bg:     "bg-amber-500/5",
      border: "border-l-2 border-l-amber-400/60 border border-border/40",
      num:    "text-amber-400",
      badge:  "bg-amber-500/15 text-amber-400",
      detalhe:"text-amber-300/60",
    },
    verde: {
      bg:     "bg-emerald-500/5",
      border: "border-l-2 border-l-emerald-500/40 border border-border/40",
      num:    "text-emerald-400",
      badge:  "bg-emerald-500/10 text-emerald-500/70",
      detalhe:"text-muted-foreground/50",
    },
  }[nivel];

  const labels = { vermelho: "Atenção", amarelo: "Observar", verde: "Normal" };

  return (
    <div className={cn("rounded-xl px-4 py-3 flex flex-col gap-1.5 relative", estilos.bg, estilos.border)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50 leading-tight">{label}</p>
        <span className={cn("text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full shrink-0", estilos.badge)}>
          {labels[nivel]}
        </span>
      </div>
      <p className={cn("font-display font-bold leading-none", estilos.num)} style={{fontSize:"22px"}}>
        {numero}
        {unidade && <span className="text-[12px] font-normal ml-1 text-muted-foreground/60">{unidade}</span>}
      </p>
      <p className={cn("text-[10px] leading-snug", estilos.detalhe)}>{detalhe}</p>
    </div>
  );
}

function InstagramAlertas({
  postsFiltered, dailyFiltered, dailyData, postsData, porFormato,
  followersByAccount, followersForecast, followersForecastAll,
  igTaxaEng, igAccount,
}: AlertasProps) {

  // Garante sempre as duas contas nos cards de seguidores
  // quando "Todas" está selecionado — usa dailyData completo
  const followersByAccountFull = useMemo(() => {
    const base = igAccount ? followersByAccount : (() => {
      const sorted: Record<string, {date:string;count:number}[]> = {};
      dailyData.forEach(d => {
        if (!sorted[d.username]) sorted[d.username] = [];
        sorted[d.username].push({date:d.date, count:d.followers_count});
      });
      const result: Record<string,{first:number;last:number}> = {};
      Object.entries(sorted).forEach(([acc, rows]) => {
        const s = rows.sort((a,b)=>a.date.localeCompare(b.date));
        result[acc] = {first:s[0].count, last:s[s.length-1].count};
      });
      return result;
    })();
    return base;
  }, [igAccount, followersByAccount, dailyData]);

  const forecast = igAccount ? followersForecast : followersForecastAll;

  // Formato — inclui todos os formatos presentes nos posts do período, mesmo com 1 post
  const porFormatoFull = useMemo(() => {
    if (porFormato.length > 0) return porFormato;
    const m: Record<string,{posts:number;eng:number;reach:number}> = {};
    postsFiltered.forEach(p => {
      const t = p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Imagem";
      if (!m[t]) m[t]={posts:0,eng:0,reach:0};
      m[t].posts++; m[t].eng+=p.like_count+p.comments_count+p.shares+p.saved; m[t].reach+=p.reach;
    });
    return Object.entries(m).map(([tipo,v])=>({
      tipo, posts:v.posts,
      engPorPost:v.posts>0?Math.round(v.eng/v.posts):0,
      taxaEng:v.reach>0?parseFloat(((v.eng/v.reach)*100).toFixed(1)):0,
    })).sort((a,b)=>b.engPorPost-a.engPorPost);
  }, [porFormato, postsFiltered]);

  const dadosRitmo = useMemo(() => {
    if (postsFiltered.length === 0) return null;
    const sorted = [...postsFiltered].sort((a,b) => b.posted_at.localeCompare(a.posted_at));
    const ultimo = new Date(sorted[0].posted_at);
    const ini = new Date(ultimo); ini.setDate(ultimo.getDate()-6);
    const semana = postsFiltered.filter(p => new Date(p.posted_at) >= ini).length;
    const dias = postsFiltered.length > 1
      ? Math.max(1, Math.round((new Date(sorted[0].posted_at).getTime()-new Date(sorted[sorted.length-1].posted_at).getTime())/86400000)) : 7;
    const media = parseFloat(((postsFiltered.length/dias)*7).toFixed(1));
    const nivel: NivelAlerta = semana < 2 ? "vermelho" : semana < 4 ? "amarelo" : "verde";
    return { semana, media, nivel };
  }, [postsFiltered]);

  const dadosEng = useMemo(() => {
    if (postsFiltered.length === 0) return null;
    const nivel: NivelAlerta = igTaxaEng < 1 ? "vermelho" : igTaxaEng < 3 ? "amarelo" : "verde";
    return { taxa: igTaxaEng, nivel };
  }, [igTaxaEng, postsFiltered.length]);

  const dadosCrescimento = useMemo(() => {
    return Object.entries(followersByAccountFull).map(([acc, f]) => {
      const fc     = forecast?.[acc];
      const label  = acc==="nexocommerce" ? "@NC" : "@NL";
      const delta  = f.last - f.first;
      const perDay = fc?.per_day ?? 0;
      const proj30 = fc?.next_30 ?? f.last;
      const src    = igAccount ? dailyFiltered : dailyData;
      const gained = src.filter(d=>d.username===acc).reduce((s,d)=>s+(d.followers_gained||0),0);
      const lost   = src.filter(d=>d.username===acc).reduce((s,d)=>s+(d.followers_lost||0),0);
      const nivel: NivelAlerta = (delta < 0 || perDay < 0) ? "vermelho" : perDay < 1 ? "amarelo" : "verde";
      return { label, delta, perDay, proj30, gained, lost, nivel };
    });
  }, [followersByAccountFull, forecast, dailyFiltered, dailyData, igAccount]);

  const dadosFormato = useMemo(() => {
    if (porFormatoFull.length === 0) return [];
    const imp: Record<string,{gained:number;lost:number;posts:number}> = {};
    postsFiltered.forEach(p => {
      const t = p.media_type==="VIDEO"?"Reel":p.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Imagem";
      if (!imp[t]) imp[t]={gained:0,lost:0,posts:0};
      [1,2].forEach(off => {
        const d=new Date(p.posted_at.split("T")[0]); d.setDate(d.getDate()+off);
        const s=dailyFiltered.find(s=>s.date===d.toISOString().split("T")[0]&&s.username===p.username);
        if (s){imp[t].gained+=s.followers_gained||0;imp[t].lost+=s.followers_lost||0;}
      });
      imp[t].posts++;
    });
    return porFormatoFull.map(f => {
      const i = imp[f.tipo]??{gained:0,lost:0,posts:1};
      const saldo = (i.gained-i.lost)/i.posts;
      const nivel: NivelAlerta = (f.taxaEng<1||saldo<-2)?"vermelho":(f.taxaEng<2||saldo<0)?"amarelo":"verde";
      return { tipo:f.tipo, posts:f.posts, taxaEng:f.taxaEng, engPorPost:f.engPorPost,
        gainedMedia:(i.gained/i.posts).toFixed(1), lostMedia:(i.lost/i.posts).toFixed(1), nivel };
    });
  }, [porFormatoFull, postsFiltered, dailyFiltered]);

  return (
    <GlassCard>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-3">
        Saúde do período
      </p>

      {/* Grid de post-its — 2 cols base, 4 cols em telas largas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
        {dadosRitmo && (
          <StickyCard
            nivel={dadosRitmo.nivel}
            label="Frequência"
            numero={String(dadosRitmo.semana)}
            unidade="posts esta semana"
            detalhe={`média do período: ${dadosRitmo.media}/sem`}
          />
        )}
        {dadosEng && (
          <StickyCard
            nivel={dadosEng.nivel}
            label="Engajamento"
            numero={dadosEng.taxa.toFixed(1)}
            unidade="% de média"
            detalhe={dadosEng.taxa >= 3 ? "acima de 3% — bom resultado" : dadosEng.taxa >= 1 ? "entre 1–3% — pode melhorar" : "abaixo de 1% — revisar conteúdo"}
          />
        )}
        {dadosCrescimento.map((d, i) => (
          <StickyCard
            key={i}
            nivel={d.nivel}
            label={`Seguidores ${d.label}`}
            numero={`${d.delta >= 0 ? "+" : ""}${d.delta}`}
            unidade="no período"
            detalhe={`${d.gained} novos · ${d.lost} saídas · ${d.perDay >= 0 ? "+" : ""}${d.perDay}/dia`}
          />
        ))}
      </div>

      {/* Por formato — linha separada, 3 cols */}
      {dadosFormato.length > 0 && (
        <>
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/30 mt-3 mb-2">Por formato</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {dadosFormato.map((f, i) => (
              <StickyCard
                key={i}
                nivel={f.nivel}
                label={`${f.tipo} · ${f.posts}p`}
                numero={String(f.taxaEng)}
                unidade="% eng."
                detalhe={`${fmt(f.engPorPost)} interações/post · +${f.gainedMedia} / −${f.lostMedia} seg./post`}
              />
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}

// ── Impacto de conteúdo em seguidores ──────────────────────────────────────────
interface ImpactoConteudoProps {
  postsData: any[];
  dailyData: any[];
  igAccount: string | null;
}

function ImpactoConteudo({ postsData, dailyData, igAccount }: ImpactoConteudoProps) {
  const hoje = new Date();
  const d7   = new Date(hoje); d7.setDate(hoje.getDate()-6);
  const fmtD = (d: Date) => d.toISOString().split("T")[0];

  const [filtroFormato, setFiltroFormato] = useState<string>("Todos");
  const [periodo, setPeriodo]             = useState<number>(7);
  const [customDe,  setCustomDe]          = useState(fmtD(d7));
  const [customAte, setCustomAte]         = useState(fmtD(hoje));
  const [customMode, setCustomMode]       = useState(false);
  const [detalhePost, setDetalhePost]     = useState<any | null>(null);

  const tipoLabel = (mt: string) => mt==="VIDEO"?"Reel":mt==="CAROUSEL_ALBUM"?"Carrossel":"Imagem";
  const corTipo   = (t: string)  => t==="Reel"?"#4CAF87":t==="Imagem"?P:"hsl(210 70% 55%)";

  const de = useMemo(() => {
    if (customMode) return customDe;
    const d = new Date(hoje); d.setDate(hoje.getDate()-(periodo-1));
    return fmtD(d);
  }, [periodo, customMode, customDe]);

  const ate = customMode ? customAte : fmtD(hoje);

  const postsFiltrados = useMemo(() => {
    return postsData.filter(p => {
      const d = p.posted_at.split("T")[0];
      return (igAccount ? p.username===igAccount : true)
        && d >= de && d <= ate
        && (filtroFormato==="Todos" || tipoLabel(p.media_type)===filtroFormato);
    }).sort((a,b) => a.posted_at.localeCompare(b.posted_at));
  }, [postsData, igAccount, de, ate, filtroFormato]);

  const dadosPorPost = useMemo(() => {
    return postsFiltrados.map(p => {
      const postDate = p.posted_at.split("T")[0];
      let gained = 0; let lost = 0;
      [1,2].forEach(offset => {
        const d = new Date(postDate); d.setDate(d.getDate()+offset);
        const snap = dailyData.find(s=>s.date===d.toISOString().split("T")[0]&&s.username===p.username);
        if (snap) { gained+=snap.followers_gained||0; lost+=snap.followers_lost||0; }
      });
      const saldo  = gained - lost;
      const tipo   = tipoLabel(p.media_type);
      const conta  = p.username==="nexocommerce"?"@NC":"@NL";
      const caption= (p.caption||"").slice(0,50)+(p.caption?.length>50?"…":"");
      const eng    = p.like_count+p.comments_count+p.shares+p.saved;
      const taxaEng= p.reach>0?parseFloat((eng/p.reach*100).toFixed(1)):0;
      return { ...p, gained, lost, saldo, tipo, conta, caption, dataLabel: postDate, eng, taxaEng };
    });
  }, [postsFiltrados, dailyData]);

  // Resumo por formato — sempre calculado sobre todos os posts do período
  const resumoPorFormato = useMemo(() => {
    const m: Record<string,{gained:number;lost:number;posts:number}> = {};
    dadosPorPost.forEach(p => {
      if (!m[p.tipo]) m[p.tipo]={gained:0,lost:0,posts:0};
      m[p.tipo].gained+=p.gained; m[p.tipo].lost+=p.lost; m[p.tipo].posts++;
    });
    return Object.entries(m).map(([tipo,v])=>({
      tipo, posts:v.posts,
      ganhos: v.gained,
      perdas: v.lost,
      saldo: v.gained-v.lost,
      saldoMedio: v.posts>0?parseFloat(((v.gained-v.lost)/v.posts).toFixed(1)):0,
    })).sort((a,b)=>b.saldo-a.saldo);
  }, [dadosPorPost]);

  const maxAbs = Math.max(...dadosPorPost.map(p=>Math.max(p.gained, p.lost, 1)),1);

  const CustomTooltip = ({active,payload,label}: any) => {
    if (!active||!payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    return (
      <div style={TT.contentStyle}>
        <p className="font-semibold text-[11px] mb-1">{p.dataLabel} · {p.tipo} · {p.conta}</p>
        <p className="text-[10px] text-muted-foreground mb-2 leading-snug">{p.caption}</p>
        <div className="flex gap-3">
          <span className="text-[11px]" style={{color:"#4CAF87"}}>+{p.gained} ganhos</span>
          <span className="text-[11px]" style={{color:"hsl(355 82% 51%)"}}>−{p.lost} perdas</span>
          <span className="text-[11px] font-bold" style={{color: p.saldo>=0?"#4CAF87":"hsl(355 82% 51%)"}}>
            saldo {p.saldo>=0?"+":""}{p.saldo}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{p.taxaEng}% engajamento</p>
      </div>
    );
  };

  function handleBarClick(data: any) {
    if (data?.activePayload?.[0]?.payload) {
      const p = data.activePayload[0].payload;
      setDetalhePost(prev => prev?.post_id===p.post_id ? null : p);
    }
  }

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
            Impacto do conteúdo em seguidores
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Ganho e perda nos 2 dias após cada publicação — clique numa barra para ver o post
          </p>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Período rápido */}
          <div className="flex gap-1">
            {([7,14,30] as number[]).map(p=>(
              <button key={p} onClick={()=>{setPeriodo(p);setCustomMode(false);setDetalhePost(null)}}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all border",
                  !customMode&&periodo===p
                    ?"bg-primary text-primary-foreground border-primary"
                    :"border-border text-muted-foreground hover:text-foreground"
                )}>{p}d</button>
            ))}
            <button onClick={()=>{setCustomMode(true);setDetalhePost(null)}}
              className={cn("px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all border",
                customMode?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:text-foreground"
              )}>Personalizado</button>
          </div>

          {/* Formato */}
          <div className="flex gap-1">
            {["Todos","Reel","Imagem","Carrossel"].map(f=>(
              <button key={f} onClick={()=>{setFiltroFormato(f);setDetalhePost(null)}}
                className={cn("px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all border",
                  filtroFormato===f?"bg-primary text-primary-foreground border-primary":"border-border text-muted-foreground hover:text-foreground"
                )}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Período personalizado */}
      {customMode && (
        <div className="flex items-center gap-2 mb-4 bg-card/40 border border-border/50 rounded-lg px-3 py-2 w-fit">
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">De</span>
          <input type="date" value={customDe} onChange={e=>setCustomDe(e.target.value)}
            className="bg-transparent text-[11px] text-foreground outline-none w-[108px]"/>
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest">até</span>
          <input type="date" value={customAte} onChange={e=>setCustomAte(e.target.value)}
            className="bg-transparent text-[11px] text-foreground outline-none w-[108px]"/>
        </div>
      )}

      {dadosPorPost.length === 0 ? (
        <p className="text-[11px] text-muted-foreground/50 py-8 text-center">
          Nenhum post encontrado para os filtros selecionados.
        </p>
      ) : (
        <>
          {/* Cards de resumo por formato */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
            {resumoPorFormato.map(f=>(
              <div key={f.tipo} className="rounded-lg border border-border/40 bg-card/20 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">{f.tipo} · {f.posts}p</p>
                <p className={cn("font-display font-bold text-lg leading-none",
                  f.saldo>0?"text-emerald-400":f.saldo<0?"text-red-400":"text-muted-foreground")}>
                  {f.saldo>=0?"+":""}{f.saldo}
                  <span className="text-[9px] font-normal ml-1 text-muted-foreground">saldo</span>
                </p>
                <div className="flex gap-2 mt-1.5">
                  <span className="text-[9px] text-emerald-400/70">+{f.ganhos}</span>
                  <span className="text-[9px] text-red-400/70">−{f.perdas}</span>
                  <span className="text-[9px] text-muted-foreground/50">{f.saldoMedio>=0?"+":""}{f.saldoMedio}/post</span>
                </div>
              </div>
            ))}
            {/* Total geral */}
            <div className="rounded-lg border border-border/40 bg-card/20 px-3 py-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Total · {dadosPorPost.length}p</p>
              {(() => {
                const tot = dadosPorPost.reduce((s,p)=>({g:s.g+p.gained,l:s.l+p.lost}),{g:0,l:0});
                const sal = tot.g-tot.l;
                return <>
                  <p className={cn("font-display font-bold text-lg leading-none",sal>0?"text-emerald-400":sal<0?"text-red-400":"text-muted-foreground")}>
                    {sal>=0?"+":""}{sal}<span className="text-[9px] font-normal ml-1 text-muted-foreground">saldo</span>
                  </p>
                  <div className="flex gap-2 mt-1.5">
                    <span className="text-[9px] text-emerald-400/70">+{tot.g}</span>
                    <span className="text-[9px] text-red-400/70">−{tot.l}</span>
                  </div>
                </>;
              })()}
            </div>
          </div>

          {/* Gráfico vertical por post */}
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-3">
            Por publicação
          </p>
          {(() => {
            const svgH = 260;
            const marginTop = 8, marginBottom = 44, marginLeft = 36, marginRight = 8;
            const innerH = svgH - marginTop - marginBottom;
            const n = dadosPorPost.length;
            const zero = innerH / 2;
            const scale = (innerH / 2) / (maxAbs || 1);
            // largura fixa em px; espaçamento proporcional ao número de posts
            const barPx = Math.max(4, Math.min(18, Math.floor(600 / n) - 4));
            // mostrar label só a cada N posts para não sobrepor
            const labelStep = n <= 10 ? 1 : n <= 20 ? 2 : n <= 40 ? 3 : 5;
            return (
              <svg width="100%" height={svgH} style={{cursor:"pointer", overflow:"visible"}}
                onClick={(e: React.MouseEvent<SVGSVGElement>) => {
                  const idx = (e.target as SVGElement).getAttribute('data-idx');
                  if (idx !== null) handleBarClick({ activePayload: [{ payload: dadosPorPost[+idx] }] });
                }}>
                <g transform={`translate(${marginLeft},${marginTop})`}>
                  {/* Linha do zero */}
                  <line x1={0} y1={zero} x2="100%" y2={zero} stroke={MUTED} strokeOpacity={0.3} strokeWidth={1}/>
                  {/* Ticks Y */}
                  {[-maxAbs, -Math.round(maxAbs/2), 0, Math.round(maxAbs/2), maxAbs].map(v => {
                    const yy = zero - v * scale;
                    return (
                      <text key={v} x={-4} y={yy+3} textAnchor="end" fill={MUTED} fontSize={9}>
                        {v > 0 ? `+${v}` : v}
                      </text>
                    );
                  })}
                  {/* Barras */}
                  {dadosPorPost.map((p, i) => {
                    const op = detalhePost ? (detalhePost.post_id === p.post_id ? 0.95 : 0.3) : 0.85;
                    const gainH = Math.max(p.gained * scale, p.gained > 0 ? 2 : 0);
                    const lostH = Math.max(p.lost * scale, p.lost > 0 ? 2 : 0);
                    const showLabel = i % labelStep === 0;
                    // posição X em % baseada no índice
                    const pct = `${((i + 0.5) / n * 100).toFixed(2)}%`;
                    const pctLeft = `calc(${pct} - ${barPx/2}px)`;
                    return (
                      <g key={i} data-idx={i}>
                        {p.gained > 0 && (
                          <rect
                            data-idx={i}
                            x={pctLeft as any}
                            y={zero - gainH}
                            width={barPx}
                            height={gainH}
                            fill="#4CAF87"
                            opacity={op}
                            rx={2}
                          />
                        )}
                        {p.lost > 0 && (
                          <rect
                            data-idx={i}
                            x={pctLeft as any}
                            y={zero}
                            width={barPx}
                            height={lostH}
                            fill="hsl(355 82% 51%)"
                            opacity={op}
                            rx={2}
                          />
                        )}
                        {showLabel && (
                          <text
                            x={pct as any}
                            y={innerH + 14}
                            textAnchor="end"
                            fill={MUTED}
                            fontSize={9}
                            transform={`rotate(-45, ${pct}, ${innerH + 14})`}
                          >
                            {`${p.dataLabel.slice(5)} ${p.tipo.slice(0,3)}`}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </g>
              </svg>
            );
          })()}

          {/* Detalhe do post clicado */}
          {detalhePost && (
            <div className="mt-3 rounded-xl border border-border/40 bg-card/30 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-0.5">Post selecionado</p>
                  <p className="text-[12px] font-semibold">{detalhePost.dataLabel} · {detalhePost.tipo} · {detalhePost.conta}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug max-w-[420px]">{(detalhePost.caption||"").slice(0,100)}{(detalhePost.caption?.length||0)>100?"…":""}</p>
                </div>
                <button onClick={()=>setDetalhePost(null)} className="text-muted-foreground/30 hover:text-muted-foreground text-xs ml-4">✕</button>
              </div>
              <div className="flex gap-5 flex-wrap items-end">
                <div>
                  <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">Seguidores ganhos</p>
                  <p className="font-bold text-emerald-400 text-xl">+{detalhePost.gained}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">Seguidores perdidos</p>
                  <p className="font-bold text-red-400 text-xl">−{detalhePost.lost}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">Saldo</p>
                  <p className={cn("font-bold text-xl",detalhePost.saldo>=0?"text-emerald-400":"text-red-400")}>
                    {detalhePost.saldo>=0?"+":""}{detalhePost.saldo}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">Engajamento</p>
                  <p className="font-bold text-foreground text-xl">{detalhePost.taxaEng}%</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest mb-0.5">Alcance</p>
                  <p className="font-bold text-foreground text-xl">{fmt(detalhePost.reach)}</p>
                </div>
                {detalhePost.permalink && (
                  <a href={detalhePost.permalink} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] text-primary hover:underline flex items-center gap-1 mb-1">
                    Ver post <ExternalLink className="h-3 w-3"/>
                  </a>
                )}
              </div>
            </div>
          )}

          <p className="text-[9px] text-muted-foreground/30 mt-3">
            Saldo = seguidores ganhos menos perdidos nos 2 dias após cada publicação
          </p>
        </>
      )}
    </GlassCard>
  );
}

// ── Análise & Insights com Claude API ──────────────────────────────────────────
interface InsightsAIProps {
  postsFiltered: any[];
  dailyFiltered: any[];
  porFormato: any[];
  horarioData: any[];
  igTaxaEng: number;
  igEngPost: number;
  erBenchmark: any[];
  igAccount: string | null;
  followersByAccount: Record<string, {first:number;last:number}>;
  followersForecast: Record<string, {per_day:number;per_30:number;next_30:number}> | null;
}

function InstagramInsightsAI({
  postsFiltered, dailyFiltered, porFormato, horarioData,
  igTaxaEng, igEngPost, erBenchmark, igAccount,
  followersByAccount, followersForecast,
}: InsightsAIProps) {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const buildPrompt = () => {
    const conta = igAccount === "nexocommerce" ? "@nexocommerce"
      : igAccount === "nexolab" ? "@nexolab"
      : "todas as contas combinadas";

    const topPost = [...postsFiltered]
      .map(p => ({...p, eng: p.like_count+p.comments_count+p.shares+p.saved,
        er: p.reach>0?(p.like_count+p.comments_count+p.shares+p.saved)/p.reach*100:0}))
      .sort((a,b) => b.er-a.er)[0];

    const melhorHorario = [...horarioData].sort((a,b)=>b.engMedio-a.engMedio)[0];
    const melhorFormato = porFormato[0];
    const piorFormato   = porFormato[porFormato.length-1];

    const followersInfo = Object.entries(followersByAccount).map(([acc, f]) => {
      const forecast = followersForecast?.[acc];
      const delta = f.last - f.first;
      const gained = dailyFiltered.filter(d=>d.username===acc).reduce((s,d)=>s+(d.followers_gained||0),0);
      const lost   = dailyFiltered.filter(d=>d.username===acc).reduce((s,d)=>s+(d.followers_lost||0),0);
      return `${acc==="nexocommerce"?"@NC":"@NL"}: ${f.last.toLocaleString("pt-BR")} seguidores, delta ${delta>=0?"+":""}${delta} no período, +${gained} novos, -${lost} saídas${forecast?`, tendência ${forecast.per_day>=0?"+":""}${forecast.per_day}/dia, previsão ${forecast.next_30.toLocaleString("pt-BR")} em 30 dias`:""}`;
    }).join("\n");

    const excelente = erBenchmark.find(f=>f.faixa.includes("Excelente"))?.posts ?? 0;
    const baixo     = erBenchmark.find(f=>f.faixa.includes("Baixo"))?.posts ?? 0;
    const totalPosts = postsFiltered.length;

    // Tendência de engajamento: últimos 7d vs 7d anteriores
    const agora = new Date();
    const d7 = new Date(agora); d7.setDate(agora.getDate()-7);
    const d14 = new Date(agora); d14.getDate()-14;
    const engUlt7  = postsFiltered.filter(p=>new Date(p.posted_at)>=d7).reduce((s,p)=>s+p.like_count+p.comments_count+p.shares+p.saved,0);
    const engAntes7 = postsFiltered.filter(p=>new Date(p.posted_at)<d7 && new Date(p.posted_at)>=d14).reduce((s,p)=>s+p.like_count+p.comments_count+p.shares+p.saved,0);
    const tendEng = engAntes7 > 0 ? Math.round((engUlt7-engAntes7)/engAntes7*100) : null;

    // Ritmo
    const sorted = [...postsFiltered].sort((a,b)=>b.posted_at.localeCompare(a.posted_at));
    const diasPeriodo = sorted.length > 1
      ? Math.max(1, Math.round((new Date(sorted[0].posted_at).getTime()-new Date(sorted[sorted.length-1].posted_at).getTime())/86400000))
      : 1;
    const postsSemana = parseFloat(((totalPosts/diasPeriodo)*7).toFixed(1));

    return `Você é um analista de dados de redes sociais. Com base EXCLUSIVAMENTE nos números abaixo, escreva uma análise em português brasileiro com 4 seções curtas. Cada seção tem um título em negrito (formato **Título**) seguido de no máximo 2 frases. Não invente dados. Não mencione setor ou nicho. Não use emojis. Use os números exatamente como fornecidos.

DADOS DO PERÍODO (${conta}):
- Total de posts: ${totalPosts}
- Ritmo: ${postsSemana} posts/semana
- Taxa de engajamento média: ${igTaxaEng.toFixed(1)}%
- Engajamento médio por post: ${Math.round(igEngPost)}
- Posts com ER >5% (excelente): ${excelente} de ${totalPosts} (${totalPosts>0?Math.round(excelente/totalPosts*100):0}%)
- Posts com ER <1% (baixo): ${baixo} de ${totalPosts} (${totalPosts>0?Math.round(baixo/totalPosts*100):0}%)
${tendEng !== null ? `- Tendência de engajamento: ${tendEng>=0?"+":""}${tendEng}% vs 7 dias anteriores` : ""}
${melhorFormato ? `- Melhor formato: ${melhorFormato.tipo} — ${Math.round(melhorFormato.engPorPost)} eng/post, ${melhorFormato.taxaEng}% ER` : ""}
${piorFormato && piorFormato !== melhorFormato ? `- Pior formato: ${piorFormato.tipo} — ${Math.round(piorFormato.engPorPost)} eng/post, ${piorFormato.taxaEng}% ER` : ""}
${melhorHorario ? `- Melhor horário: ${melhorHorario.hora} com ${melhorHorario.engMedio} eng. médio` : ""}
${topPost ? `- Post destaque: ${topPost.er.toFixed(1)}% ER em ${topPost.posted_at?.split("T")[0]} (${topPost.media_type==="VIDEO"?"Reel":topPost.media_type==="CAROUSEL_ALBUM"?"Carrossel":"Imagem"})` : ""}
${followersInfo}

Estruture EXATAMENTE assim (4 seções, sem numeração, só o título em negrito e o texto):

**Crescimento e seguidores**
[texto]

**Engajamento**
[texto]

**O que está funcionando**
[texto]

**Oportunidade ou alerta**
[texto]`;
  };

  // Parse das seções do texto retornado
  function parseSections(text: string): { title: string; body: string }[] {
    const sections: { title: string; body: string }[] = [];
    const regex = /\*\*(.+?)\*\*\s*([\s\S]*?)(?=\n\*\*|$)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const body = match[2].trim();
      if (body) sections.push({ title: match[1].trim(), body });
    }
    // fallback: parágrafos simples se não encontrar padrão
    if (sections.length === 0) {
      text.split("\n").filter(l=>l.trim()).forEach((l,i) => {
        sections.push({ title: `Seção ${i+1}`, body: l.replace(/^\d+\.\s*/,"") });
      });
    }
    return sections;
  }

  async function generate() {
    setLoading(true);
    setAnalysis("");
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          messages: [{ role: "user", content: buildPrompt() }],
        }),
      });
      const data = await res.json();
      const text = data.content?.find((b:any) => b.type === "text")?.text ?? "Não foi possível gerar a análise.";
      setAnalysis(text);
      setGenerated(true);
    } catch {
      setAnalysis("Erro ao conectar com a API. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const sections = analysis ? parseSections(analysis) : [];

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
            Análise & Insights
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Interpretação automática dos dados do período
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
            loading
              ? "border-border text-muted-foreground cursor-not-allowed"
              : "border-primary/40 text-primary hover:bg-primary/10"
          )}>
          {loading ? (
            <>
              <span className="inline-block h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin"/>
              Analisando...
            </>
          ) : generated ? "Reanalisar" : "✦ Gerar análise"}
        </button>
      </div>

      {!analysis && !loading && (
        <div className="py-6 text-center text-[11px] text-muted-foreground/50">
          Clique em "Gerar análise" para interpretar os dados do período com IA.
        </div>
      )}

      {loading && (
        <div className="space-y-3 py-2">
          {[90,75,85,65].map((w,i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 rounded bg-muted/30 animate-pulse w-24"/>
              <div className="h-2 rounded bg-muted/20 animate-pulse" style={{width:`${w}%`}}/>
              <div className="h-2 rounded bg-muted/15 animate-pulse" style={{width:`${w-15}%`}}/>
            </div>
          ))}
        </div>
      )}

      {sections.length > 0 && !loading && (
        <div className="space-y-0">
          {sections.map((s, i) => (
            <div key={i} className={cn(
              "py-3",
              i < sections.length - 1 && "border-b border-border/30"
            )}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">
                {s.title}
              </p>
              <p className="text-[11px] text-foreground/80 leading-relaxed">
                {s.body}
              </p>
            </div>
          ))}
          <p className="text-[9px] text-muted-foreground/30 pt-3">
            Gerado com base nos dados exibidos · não substitui julgamento humano
          </p>
        </div>
      )}
    </GlassCard>
  );
}
