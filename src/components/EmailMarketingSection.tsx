import { useState, useMemo, useCallback, useEffect } from "react";
import { GlassCard } from "@/components/GlassCard";
import { KPICard } from "@/components/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmailCampaigns, EmailCampaign } from "@/hooks/useEmailMarketing";
import {
  Mail, TrendingUp, Users, MousePointerClick,
  BarChart2, ChevronDown, ChevronUp, X, ArrowUpDown,
  CheckCircle2, AlertCircle, Newspaper, ShoppingBag,
  Sparkles, Shield, GitCompare, Clock, ArrowLeft, ExternalLink,
  TriangleAlert, Trophy, Layers,
} from "lucide-react";
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

// ── Visuais ───────────────────────────────────────────────────────────────────

const TT = {
  contentStyle: {
    background: "hsl(240 20% 11%)",
    border: "1px solid hsl(240 15% 14%)",
    borderRadius: 10, fontSize: 11,
    color: "hsl(0 0% 96%)",
    minWidth: 140, padding: "8px 12px",
  },
  labelStyle: { color: "hsl(0 0% 96%)", fontWeight: 600, marginBottom: 2 },
  itemStyle:  { color: "hsl(0 0% 80%)" },
  cursor:     { fill: "hsl(0 0% 100% / 0.03)" },
};

const P     = "hsl(213 94% 55%)";
const GOLD  = "hsl(43 96% 56%)";
const GREEN = "hsl(142 71% 45%)";
const MUTED = "hsl(0 0% 50%)";

const pct  = (n: number) => n.toFixed(1) + "%";
const fmt  = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(Math.round(n));

// Benchmark do setor — educação/confecção B2B Brasil
const BENCHMARK = {
  open_rate:        { good: 30, warn: 20,  label: "Abertura",     ref: "Setor B2B Educação" },
  click_rate:       { good: 3,  warn: 1.5, label: "Clique",       ref: "Setor B2B Educação" },
  bounce_rate:      { good: 1,  warn: 2,   label: "Bounce",       ref: "Máx recomendado",   invert: true },
  spam_rate:        { good: 0.05, warn: 0.1, label: "Spam",       ref: "Máx recomendado",   invert: true },
  unsubscribe_rate: { good: 0.3, warn: 0.5, label: "Descadastro", ref: "Máx recomendado",   invert: true },
  delivery_rate:    { good: 98, warn: 95,  label: "Entrega",      ref: "Mínimo esperado" },
};

type EmailTab = "visao-geral" | "campanhas";

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60 mb-3">
      {children}
    </p>
  );
}

function TypeBadge({ type }: { type: "news" | "commercial" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
      type === "news"
        ? "bg-blue-500/15 text-blue-400"
        : "bg-primary/15 text-primary"
    )}>
      {type === "news"
        ? <Newspaper className="h-2.5 w-2.5" />
        : <ShoppingBag className="h-2.5 w-2.5" />}
      {type === "news" ? "News" : "Comercial"}
    </span>
  );
}

// ── Score de entregabilidade ──────────────────────────────────────────────────

function calcDelivScore(c: EmailCampaign): { score: number; level: "green" | "yellow" | "red"; label: string } {
  let score = 100;
  // Penalidades
  if (c.bounce_rate > 2)      score -= 30;
  else if (c.bounce_rate > 1) score -= 15;
  if (c.spam_rate > 0.1)      score -= 25;
  else if (c.spam_rate > 0.05) score -= 10;
  if (c.unsubscribe_rate > 0.5) score -= 15;
  else if (c.unsubscribe_rate > 0.3) score -= 7;
  if (c.delivery_rate < 95)   score -= 20;
  else if (c.delivery_rate < 98) score -= 8;
  score = Math.max(0, Math.min(100, score));
  const level = score >= 75 ? "green" : score >= 50 ? "yellow" : "red";
  const label = score >= 75 ? "Boa entregabilidade" : score >= 50 ? "Atenção necessária" : "Risco de reputação";
  return { score, level, label };
}

function DelivScore({ campaign }: { campaign: EmailCampaign }) {
  const { score, level, label } = calcDelivScore(campaign);
  const color = level === "green" ? GREEN : level === "yellow" ? GOLD : P;
  const pctW  = `${score}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold">{label}</span>
        <span className="text-lg font-bold" style={{ color }}>{score}/100</span>
      </div>
      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: pctW, background: color }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t border-border/30">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {fmt(campaign.recipients)} destinatários
        </span>
        <span>{fmt(campaign.delivered)} entregues</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          {
            key: "bounce_rate",      val: campaign.bounce_rate,      good: 1,    warn: 2,    inv: true,
            abs: fmt(campaign.recipients - campaign.delivered),
          },
          {
            key: "spam_rate",        val: campaign.spam_rate,        good: 0.05, warn: 0.1,  inv: true,
            abs: fmt(Math.round(campaign.delivered * campaign.spam_rate / 100)),
          },
          {
            key: "unsubscribe_rate", val: campaign.unsubscribe_rate, good: 0.3,  warn: 0.5,  inv: true,
            abs: fmt(Math.round(campaign.delivered * campaign.unsubscribe_rate / 100)),
          },
        ].map(({ key, val, good, warn, inv, abs }) => {
          const ok  = inv ? val <= good : val >= good;
          const med = inv ? val <= warn : val >= warn;
          const col = ok ? GREEN : med ? GOLD : P;
          const lbl = BENCHMARK[key as keyof typeof BENCHMARK]?.label ?? key;
          return (
            <div key={key} className="text-center">
              <p className="text-[9px] text-muted-foreground">{lbl}</p>
              <p className="text-sm font-bold" style={{ color: col }}>{pct(val)}</p>
              <p className="text-[9px] text-muted-foreground">({abs})</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Análise IA por campanha ───────────────────────────────────────────────────

function CampaignAI({ campaign }: { campaign: EmailCampaign }) {
  const [result, setResult] = useState<{
    insight_assunto: string | null;
    pontos: string[];
    riscos: string[];
    recomendacoes: string[];
  } | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [subjectInput, setSubjectInput] = useState("");
  const [showInput, setShowInput] = useState(false);

  const generate = useCallback(async (subjectOverride?: string) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      // Assunto: preferir override manual > campo do banco > null
      const subject = subjectOverride ?? campaign.subject ?? "";
      const temAssunto = subject.trim().length > 0;

      // Análise do assunto (só se tiver)
      const temNumero   = temAssunto && /\d/.test(subject);
      const temEmoji    = temAssunto && /[\u{1F300}-\u{1FAFF}]/u.test(subject);
      const temPergunta = temAssunto && subject.includes("?");
      const temUrgencia = temAssunto && /agora|hoje|últim|última|encerr|limit|vagas|expira/i.test(subject);
      const tamanho     = subject.length;
      const tipoPalavra = !temAssunto ? null
        : temPergunta ? "pergunta" : temUrgencia ? "urgência" : temNumero ? "número/dado" : "declarativo";

      const blocoAssunto = temAssunto
        ? [
            "ASSUNTO DO EMAIL (linha de subject que o lead vê na caixa de entrada):",
            subject,
            "",
            "ANÁLISE DO ASSUNTO:",
            "- Tipo de gatilho: " + String(tipoPalavra),
            "- Tem número/dado: " + (temNumero ? "sim" : "não"),
            "- Tem emoji: " + (temEmoji ? "sim" : "não"),
            "- Tem urgência: " + (temUrgencia ? "sim" : "não"),
            "- Comprimento: " + tamanho + " caracteres (ideal: 40-60 para mobile)",
          ].join("\n")
        : "ASSUNTO: não disponível via API. Análise baseada nas métricas e nome da campanha.";

      const insightPrompt = temAssunto
        ? '"insight_assunto": "2 frases analisando o assunto: qual gatilho foi usado, como impactou a abertura de ' + pct(campaign.open_rate) + '.",'
        : '"insight_assunto": null,';

      const prompt = [
        "Você é especialista em email marketing para educação empresarial voltada a confecções no Brasil.",
        "Empresa: Costurando Sucesso (CS) — cursos, mentorias e consultorias para gestores de confecções.",
        "",
        "CAMPANHA:",
        "- Nome: " + campaign.name,
        "- Tipo: " + (campaign.type === "news" ? "Newsletter" : "Comercial"),
        "- Enviado: " + (campaign.sent_at ? new Date(campaign.sent_at).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : "N/A"),
        "- Destinatários: " + campaign.recipients.toLocaleString("pt-BR"),
        "",
        blocoAssunto,
        "",
        "MÉTRICAS:",
        "- Abertura: " + pct(campaign.open_rate) + " (benchmark 25-35%)",
        "- Clique: " + pct(campaign.click_rate) + " (benchmark 2-4%)",
        "- Bounce: " + pct(campaign.bounce_rate) + " (max 2%)",
        "- Spam: " + pct(campaign.spam_rate) + " (max 0.1%)",
        "- Descadastros: " + pct(campaign.unsubscribe_rate) + " (max 0.5%)",
        "- Entrega: " + pct(campaign.delivery_rate),
        "",
        "PÚBLICO: Empresários de confecções, práticos, leem email cedo (6h-8h) ou no almoço.",
        "",
        "Responda APENAS com JSON válido sem texto antes ou depois:",
        "{",
        "  " + insightPrompt,
        '  "pontos": ["ponto positivo 1 com número real", "ponto 2", "ponto 3"],',
        '  "riscos": ["risco 1 com número real", "risco 2"],',
        '  "recomendacoes": ["recomendação acionável 1", "recomendação 2", "recomendação 3"]',
        "}",
      ].join("\n");

      const resp = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      let data: any;
      try { data = await resp.json(); } catch { throw new Error("Resposta inválida da API"); }
      const text = data.content?.find((b: any) => b.type === "text")?.text ?? "";
      // Extrair primeiro bloco JSON da resposta (robusto a texto antes/depois)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Nenhum JSON na resposta da API");
      let parsed: any;
      try { parsed = JSON.parse(jsonMatch[0]); } catch (pe) {
        throw new Error("JSON inválido: " + String(pe).slice(0, 60));
      }
      if (!parsed.pontos || !parsed.recomendacoes) throw new Error("Estrutura inesperada na resposta");
      setResult(parsed);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[CampaignAI] erro:", msg);
      setError(`Erro: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [campaign]);

  if (!result && !loading && !error) {
    return (
      <div className="space-y-3">
        {showInput ? (
          <div className="flex gap-2">
            <input
              value={subjectInput}
              onChange={e => setSubjectInput(e.target.value)}
              placeholder="Cole o assunto do email aqui (opcional)..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-border bg-card/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              onKeyDown={e => e.key === "Enter" && generate(subjectInput || undefined)}
            />
            <button
              onClick={() => generate(subjectInput || undefined)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground">
              <Sparkles className="h-3 w-3" /> Analisar
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => generate()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-primary/30 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">
              <Sparkles className="h-3.5 w-3.5" />
              Gerar análise com IA
            </button>
            <button onClick={() => setShowInput(true)}
              className="px-3 py-2.5 rounded-xl border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors whitespace-nowrap">
              + Informar assunto
            </button>
          </div>
        )}
        {!showInput && (
          <p className="text-[9px] text-muted-foreground text-center">
            Sem assunto: análise baseada nas métricas e nome da campanha · clique em "+ Informar assunto" para análise mais precisa
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          Analisando campanha...
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 rounded" style={{ width: `${88 - i * 10}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-primary">{error}</p>
        <button onClick={generate}
          className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <Sparkles className="h-3 w-3" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="space-y-5">
      {/* Insight do assunto — destaque visual */}
      {result.insight_assunto && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">
              Insight do assunto
            </p>
            <p className="text-[11px] text-foreground/90 leading-relaxed">{result.insight_assunto}</p>
          </div>
        </div>
      )}
      {!result.insight_assunto && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/40">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-[10px] text-muted-foreground">
            Assunto não disponível — análise baseada nas métricas.
            <button onClick={() => { setResult(null); setShowInput(true); }}
              className="ml-1 text-primary hover:underline">
              Informar assunto para análise completa
            </button>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pontos positivos */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1">
            <Trophy className="h-3 w-3" /> Pontos positivos
          </p>
          <ul className="space-y-1.5">
            {result.pontos.map((p, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-foreground/80">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Riscos */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1">
            <TriangleAlert className="h-3 w-3" /> Pontos de atenção
          </p>
          <ul className="space-y-1.5">
            {result.riscos.map((r, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-foreground/80">
                <AlertCircle className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Recomendações */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Para o próximo
          </p>
          <ul className="space-y-1.5">
            {result.recomendacoes.map((rec, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-foreground/80">
                <span className="text-gold font-bold shrink-0">{i + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <button onClick={generate}
        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mt-1">
        <Sparkles className="h-3 w-3" /> Regerar análise
      </button>
    </div>
  );
}

// ── Página completa de campanha ───────────────────────────────────────────────

function CampaignPage({
  campaign,
  allCampaigns,
  onBack,
}: {
  campaign: EmailCampaign;
  allCampaigns: EmailCampaign[];
  onBack: () => void;
}) {
  // Detectar par A/B
  const abPair = useMemo(() => {
    if (!campaign.ab_group_id) return null;
    return allCampaigns.filter(c => c.ab_group_id === campaign.ab_group_id && c.id !== campaign.id);
  }, [campaign, allCampaigns]);

  // Dados históricos de campanhas do mesmo tipo para linha de tendência
  const historico = useMemo(() => {
    return allCampaigns
      .filter(c => c.type === campaign.type && c.sent_at)
      .sort((a, b) => (a.sent_at ?? "") < (b.sent_at ?? "") ? -1 : 1)
      .slice(-12)
      .map(c => ({
        data: c.sent_at ? new Date(c.sent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "",
        abertura: parseFloat(c.open_rate.toFixed(1)),
        clique:   parseFloat(c.click_rate.toFixed(1)),
        atual:    c.id === campaign.id,
      }));
  }, [campaign, allCampaigns]);

  // Previsão simples — média dos últimos 3
  const previsao = useMemo(() => {
    const recentes = allCampaigns
      .filter(c => c.type === campaign.type && c.sent_at && c.id !== campaign.id)
      .sort((a, b) => (a.sent_at ?? "") > (b.sent_at ?? "") ? -1 : 1)
      .slice(0, 5);
    if (recentes.length < 2) return null;
    const avgOpen  = recentes.reduce((s, c) => s + c.open_rate, 0) / recentes.length;
    const avgClick = recentes.reduce((s, c) => s + c.click_rate, 0) / recentes.length;
    const trend    = recentes[0].open_rate - recentes[recentes.length - 1].open_rate > 2 ? "queda" :
                     recentes[0].open_rate - recentes[recentes.length - 1].open_rate < -2 ? "alta" : "estável";
    return { avgOpen, avgClick, trend, n: recentes.length };
  }, [campaign, allCampaigns]);

  // Radar vs benchmark
  const radarData = [
    { metric: "Abertura",  valor: Math.min(campaign.open_rate / 35 * 100, 100),  bench: 100 },
    { metric: "Clique",    valor: Math.min(campaign.click_rate / 3 * 100, 100),   bench: 100 },
    { metric: "Entrega",   valor: Math.min(campaign.delivery_rate / 99 * 100, 100), bench: 100 },
    { metric: "Anti-bounce", valor: Math.max(0, 100 - campaign.bounce_rate / 2 * 100), bench: 100 },
    { metric: "Anti-spam", valor: Math.max(0, 100 - campaign.spam_rate / 0.1 * 100),   bench: 100 },
  ];

  const { score: delivScore, level: delivLevel } = calcDelivScore(campaign);

  return (
    <div className="space-y-5">
      {/* Voltar + link RD */}
      <div className="flex items-center justify-between">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar às campanhas
        </button>
        <a
          href={`https://app.rdstation.com.br/marketing/email-marketing/${campaign.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded-lg px-3 py-1.5 hover:border-border"
        >
          <ExternalLink className="h-3 w-3" />
          Ver no RD Station
        </a>
      </div>

      {/* Header da campanha */}
      <GlassCard>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5">
            <TypeBadge type={campaign.type} />
            <h2 className="text-base font-bold leading-snug">{campaign.name}</h2>
            {campaign.subject && (
              <p className="text-[11px] text-muted-foreground">Assunto: "{campaign.subject}"</p>
            )}
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {campaign.sent_at
                  ? new Date(campaign.sent_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric" })
                  : "Data não disponível"}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {fmt(campaign.recipients)} destinatários
              </span>
              {campaign.version !== "general" && (
                <span className="px-1.5 py-0.5 rounded bg-gold/15 text-gold font-bold text-[9px]">
                  Versão {campaign.version}
                </span>
              )}
            </div>
          </div>

          {/* Score de entregabilidade resumido */}
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground mb-0.5">Score entregabilidade</p>
            <p className="text-3xl font-bold" style={{
              color: delivLevel === "green" ? GREEN : delivLevel === "yellow" ? GOLD : P
            }}>
              {delivScore}
            </p>
            <p className="text-[9px] text-muted-foreground">/100</p>
          </div>
        </div>
      </GlassCard>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            title: "Abertura",     value: pct(campaign.open_rate),      bench: 30,  inv: false, icon: Mail,
            abs: fmt(Math.round(campaign.delivered * campaign.open_rate / 100)) + " aberturas",
          },
          {
            title: "Clique",       value: pct(campaign.click_rate),      bench: 3,   inv: false, icon: MousePointerClick,
            abs: fmt(Math.round(campaign.delivered * campaign.click_rate / 100)) + " cliques",
          },
          {
            title: "Bounce",       value: pct(campaign.bounce_rate),     bench: 2,   inv: true,  icon: AlertCircle,
            abs: fmt(campaign.recipients - campaign.delivered) + " e-mails",
          },
          {
            title: "Descadastros", value: pct(campaign.unsubscribe_rate),bench: 0.5, inv: true,  icon: Users,
            abs: fmt(Math.round(campaign.delivered * campaign.unsubscribe_rate / 100)) + " descadastros",
          },
        ].map(({ title, value, bench, inv, icon: Icon, abs }) => {
          const num = parseFloat(value);
          const ok  = inv ? num <= bench : num >= bench;
          return (
            <KPICard key={title} title={title} value={value} icon={Icon}
              subtitle={`${abs} · ${ok ? `✓ ${inv ? "dentro" : "acima"} do benchmark` : `⚠ benchmark: ${bench}%`}`}
              trend={ok ? "up" : "down"} />
          );
        })}
      </div>

      {/* Radar + Entregabilidade */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard>
          <SubTitle>Performance vs benchmark do setor</SubTitle>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(0 0% 20%)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: MUTED }} />
              <Radar name="Benchmark" dataKey="bench" stroke={MUTED} fill={MUTED} fillOpacity={0.1} strokeDasharray="4 2" />
              <Radar name="Campanha"  dataKey="valor" stroke={P}     fill={P}     fillOpacity={0.25} />
              <Tooltip {...TT} formatter={(v: number) => v.toFixed(0) + " pts"} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </RadarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <SubTitle>Score de entregabilidade</SubTitle>
          <DelivScore campaign={campaign} />
        </GlassCard>
      </div>

      {/* Tendência histórica */}
      {historico.length > 2 && (
        <GlassCard>
          <SubTitle>
            Tendência — últimas {historico.length} campanhas {campaign.type === "news" ? "news" : "comerciais"}
          </SubTitle>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={historico}>
              <XAxis dataKey="data" tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip {...TT} formatter={(v: number) => pct(v)} />
              <Line type="monotone" dataKey="abertura" stroke={P}    strokeWidth={2} dot={(props: any) => {
                const { cx, cy, payload } = props;
                return payload.atual
                  ? <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={P} stroke="hsl(240 20% 11%)" strokeWidth={2} />
                  : <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={2} fill={P} />;
              }} />
              <Line type="monotone" dataKey="clique"   stroke={GOLD} strokeWidth={1.5} dot={false} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
          {previsao && (
            <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Previsão próxima campanha similar
              </p>
              <div className="flex gap-6">
                <div>
                  <p className="text-[9px] text-muted-foreground">Abertura esperada</p>
                  <p className="text-sm font-bold text-primary">{pct(previsao.avgOpen)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Clique esperado</p>
                  <p className="text-sm font-bold" style={{ color: GOLD }}>{pct(previsao.avgClick)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Tendência</p>
                  <p className={cn("text-sm font-bold",
                    previsao.trend === "alta" ? "text-emerald-400" :
                    previsao.trend === "queda" ? "text-primary" : "text-muted-foreground")}>
                    {previsao.trend === "alta" ? "↗ Alta" : previsao.trend === "queda" ? "↘ Queda" : "→ Estável"}
                  </p>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1.5">
                Baseado nas últimas {previsao.n} campanhas do mesmo tipo
              </p>
            </div>
          )}
        </GlassCard>
      )}

      {/* Comparação A/B automática */}
      {abPair && abPair.length > 0 && (
        <GlassCard>
          <SubTitle>Teste A/B — comparação automática</SubTitle>
          <div className="grid grid-cols-2 gap-4">
            {[campaign, ...abPair].slice(0, 2).map((c, idx) => {
              const isWinner = idx === 0
                ? campaign.open_rate >= (abPair[0]?.open_rate ?? 0)
                : (abPair[0]?.open_rate ?? 0) > campaign.open_rate;
              return (
                <div key={c.id} className={cn(
                  "rounded-xl p-4 border",
                  isWinner ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-muted/10"
                )}>
                  {isWinner && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 mb-2">
                      <Trophy className="h-3 w-3" /> Versão vencedora
                    </div>
                  )}
                  <p className="text-[10px] font-bold mb-3">
                    Versão {c.version} — {c.name}
                  </p>
                  {[
                    { l: "Abertura",  v: pct(c.open_rate) },
                    { l: "Clique",    v: pct(c.click_rate) },
                    { l: "Bounce",    v: pct(c.bounce_rate) },
                    { l: "Enviados",  v: fmt(c.recipients) },
                  ].map(({ l, v }) => (
                    <div key={l} className="flex justify-between text-[11px] py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Análise IA */}
      <GlassCard>
        <SubTitle>Análise com inteligência artificial</SubTitle>
        <CampaignAI campaign={campaign} />
      </GlassCard>
    </div>
  );
}

// ── Comparador livre ──────────────────────────────────────────────────────────

function Comparador({
  items,
  onClose,
  type,
}: {
  items: EmailCampaign[];
  onClose: () => void;
}) {
  const COLORS = [P, GOLD, GREEN, "hsl(220 80% 60%)", "hsl(280 70% 60%)"];

  const radarData = useMemo(() => {
    const campaigns = items;
    const metrics = ["open_rate", "click_rate", "delivery_rate"] as const;
    const maxes = metrics.reduce((m, k) => ({
      ...m,
      [k]: Math.max(...campaigns.map(c => c[k] || 0), 0.01),
    }), {} as Record<string, number>);

    return [
      { metric: "Abertura"  },
      { metric: "Clique"    },
      { metric: "Entrega"   },
      { metric: "Anti-bounce" },
      { metric: "Anti-spam" },
    ].map((row, i) => {
      const obj: any = { metric: row.metric };
      campaigns.forEach((c, ci) => {
        const vals = [
          c.open_rate / 35 * 100,
          c.click_rate / 3 * 100,
          c.delivery_rate / 99 * 100,
          Math.max(0, 100 - c.bounce_rate / 2 * 100),
          Math.max(0, 100 - c.spam_rate / 0.1 * 100),
        ];
        obj[`item_${ci}`] = Math.min(100, vals[i]);
      });
      return obj;
    });
  }, [items]);

  const barData = useMemo(() => {
    const campaigns = items;
    return [
      { metric: "Abertura (%)",     ...Object.fromEntries(campaigns.map((c, i) => [`item_${i}`, parseFloat(c.open_rate.toFixed(1))])) },
      { metric: "Clique (%)",       ...Object.fromEntries(campaigns.map((c, i) => [`item_${i}`, parseFloat(c.click_rate.toFixed(1))])) },
      { metric: "Bounce (%)",       ...Object.fromEntries(campaigns.map((c, i) => [`item_${i}`, parseFloat(c.bounce_rate.toFixed(2))])) },
      { metric: "Descadastro (%)",  ...Object.fromEntries(campaigns.map((c, i) => [`item_${i}`, parseFloat(c.unsubscribe_rate.toFixed(2))])) },
    ];
  }, [items]);

  const getName = (item: EmailCampaign) =>
    item.name.length > 25 ? item.name.slice(0, 23) + "…" : item.name;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 pt-8 pb-16 px-4">
      <div className="w-full max-w-4xl bg-background border border-border rounded-2xl shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-widest">
              Comparador — {items.length} campanhas
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/40 transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Legenda de cores */}
        <div className="flex gap-4 flex-wrap">
          {items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i] }} />
              <span className="text-[11px] font-medium">{getName(item)}</span>
            </div>
          ))}
        </div>


        <>
            {/* Radar */}
            <GlassCard>
              <SubTitle>Performance relativa (radar)</SubTitle>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(0 0% 20%)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: MUTED }} />
                  {items.map((_, i) => (
                    <Radar key={i} name={getName(items[i])}
                      dataKey={`item_${i}`}
                      stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
                  ))}
                  <Tooltip {...TT} formatter={(v: number) => v.toFixed(0) + " pts"} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Barras agrupadas */}
            <GlassCard>
              <SubTitle>Métricas lado a lado</SubTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barGap={4}>
                  <XAxis dataKey="metric" tick={{ fontSize: 10, fill: MUTED }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip {...TT} />
                  {items.map((_, i) => (
                    <Bar key={i} dataKey={`item_${i}`} name={getName(items[i])}
                      fill={COLORS[i]} radius={[3, 3, 0, 0]} />
                  ))}
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Tabela detalhada */}
            <GlassCard className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Métrica</th>
                      {items.map((item, i) => (
                        <th key={i} className="text-right px-4 py-2.5 font-medium" style={{ color: COLORS[i] }}>
                          {getName(item)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Enviados",      key: "recipients",      fmt: (v: number) => fmt(v) },
                      { label: "Entregues",     key: "delivered",       fmt: (v: number) => fmt(v) },
                      { label: "Entrega",       key: "delivery_rate",   fmt: (v: number) => pct(v) },
                      { label: "Abertura",      key: "open_rate",       fmt: (v: number) => pct(v), highlight: true },
                      { label: "Clique",        key: "click_rate",      fmt: (v: number) => pct(v), highlight: true },
                      { label: "Bounce",        key: "bounce_rate",     fmt: (v: number) => pct(v) },
                      { label: "Spam",          key: "spam_rate",       fmt: (v: number) => pct(v) },
                      { label: "Descadastros",  key: "unsubscribe_rate",fmt: (v: number) => pct(v) },
                    ].map(({ label, key, fmt: fmtFn, highlight }) => {
                      const campaigns = items as EmailCampaign[];
                      const values = campaigns.map(c => (c as any)[key] as number);
                      const maxVal = Math.max(...values);
                      const minVal = Math.min(...values);
                      const inverted = ["bounce_rate","spam_rate","unsubscribe_rate"].includes(key);
                      return (
                        <tr key={key} className="border-b border-border/40 hover:bg-muted/10">
                          <td className="px-4 py-2.5 text-muted-foreground">{label}</td>
                          {values.map((v, i) => {
                            const isBest = inverted ? v === minVal : v === maxVal;
                            return (
                              <td key={i} className={cn(
                                "text-right px-4 py-2.5 font-semibold",
                                highlight && isBest && "text-emerald-400"
                              )}>
                                {fmtFn(v)}
                                {highlight && isBest && values.filter(x => x === v).length < values.length && (
                                  <span className="ml-1 text-[9px]">✓</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
        </>
      </div>
    </div>
  );
}

// ── Análise IA — Visão Geral do período ──────────────────────────────────────

interface VisaoGeralTotals {
  total: number; totalComercial: number; totalNews: number;
  avgOpen: number; avgClick: number; avgBounce: number;
  avgOpenC: number; avgOpenN: number; avgClickC: number; avgClickN: number;
  totalRecip: number; abTests: number;
}

function VisaoGeralAI({ campaigns, totals }: { campaigns: EmailCampaign[]; totals: VisaoGeralTotals }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{
    diagnostico: string;
    destaques: string[];
    alertas: string[];
    acoes: string[];
    contexto_setor: string;
  } | null>(null);
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Top 3 e bottom 3 campanhas por abertura
      const sorted     = [...campaigns].filter(c => c.sent_at).sort((a, b) => b.open_rate - a.open_rate);
      const top3       = sorted.slice(0, 3).map(c => `${c.name} (${pct(c.open_rate)})`).join(", ");
      const bottom3    = sorted.slice(-3).map(c => `${c.name} (${pct(c.open_rate)})`).join(", ");
      const highBounce = campaigns.filter(c => c.bounce_rate > 2).length;
      const highSpam   = campaigns.filter(c => c.spam_rate > 0.1).length;
      const bestScore  = Math.max(...campaigns.map(c => calcDelivScore(c).score));
      const worstScore = Math.min(...campaigns.map(c => calcDelivScore(c).score));

      const prompt = `Você é especialista sênior em email marketing para o setor de educação empresarial voltada para confecções e indústria têxtil no Brasil. A empresa é a Costurando Sucesso, que oferece cursos, mentorias e consultorias para empresários e gestores de confecções.

Analise o panorama completo de email marketing do período:

DADOS GERAIS:
- Total de campanhas: ${totals.total} (${totals.totalComercial} comerciais, ${totals.totalNews} newsletters)
- Total de destinatários: ${fmt(totals.totalRecip)}
- Abertura média geral: ${pct(totals.avgOpen)} (benchmark setor educação B2B: 25-35%)
- Clique médio geral: ${pct(totals.avgClick)} (benchmark: 2-4%)
- Bounce médio: ${pct(totals.avgBounce)} (limite: 2%)
- Campanhas com bounce acima de 2%: ${highBounce}
- Campanhas com spam acima de 0.1%: ${highSpam}

SPLIT COMERCIAL vs NEWS:
- Comercial: abertura ${pct(totals.avgOpenC)}, clique ${pct(totals.avgClickC)}
- Newsletter: abertura ${pct(totals.avgOpenN)}, clique ${pct(totals.avgClickN)}

DESTAQUES:
- Top 3 abertura: ${top3}
- Bottom 3 abertura: ${bottom3}
- Melhor score de entregabilidade: ${bestScore}/100
- Pior score de entregabilidade: ${worstScore}/100
- Testes A/B realizados: ${totals.abTests}

CONTEXTO DO SETOR:
O público é formado por empresários e gestores de confecções brasileiras. São pessoas práticas, com pouco tempo, que leem email principalmente de manhã cedo (6h-8h) e no horário de almoço. Respondem bem a conteúdo que resolve problema imediato do dia a dia da confecção (produção, custo, gestão de equipe, fornecedores). Campanhas de lançamento têm picos de abertura nos primeiros 2 dias. O setor tem sazonalidade marcada: alta em fev-mar (coleção inverno), jun-jul (coleção verão), set-out (planejamento fim de ano).

Responda APENAS com JSON válido neste formato, sem texto antes ou depois:
{
  "diagnostico": "parágrafo de 2-3 frases com diagnóstico honesto e direto do período",
  "destaques": ["destaque positivo 1", "destaque positivo 2", "destaque positivo 3"],
  "alertas": ["alerta crítico 1", "alerta crítico 2"],
  "acoes": ["ação prioritária 1 muito específica e acionável", "ação prioritária 2", "ação prioritária 3"],
  "contexto_setor": "uma frase sobre como os resultados se comparam com o momento atual do setor de educação para confecções"
}`;

      const resp = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await resp.json();
      const text = data.content?.find((b: any) => b.type === "text")?.text ?? "";
      const clean = text.replace(/```json|```/g, "").trim();
      setResult(JSON.parse(clean));
    } catch (e) {
      setError("Erro ao gerar análise. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [campaigns, totals]);

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <SubTitle>Análise IA do período</SubTitle>
        {result && (
          <button onClick={generate}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            <Sparkles className="h-3 w-3" /> Regerar
          </button>
        )}
      </div>

      {!result && !loading && !error && (
        <div className="space-y-3">
          {/* Insights fixos do setor enquanto não gera IA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              { icon: Clock, title: "Melhor horário para o setor", body: "6h–8h (antes do chão de fábrica abrir) e 12h–13h (almoço). Evitar após 17h — empresários de confecção raramente checam email no fim do expediente." },
              { icon: TrendingUp, title: "O que funciona no setor", body: "Assuntos com número + benefício direto (ex: '3 erros que aumentam seu custo de produção'). Newsletter educativa abre 40% mais que email puramente comercial." },
              { icon: Shield, title: "Sazonalidade confecção", body: "Picos de engajamento: fev-mar (coleção inverno), jun-jul (verão), set-out (planejamento Black Friday). Evitar grandes campanhas em jan e jul — baixo engajamento histórico." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="p-3 rounded-xl bg-muted/20 border border-border/50 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
                </div>
                <p className="text-[11px] text-foreground/80 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <button onClick={generate}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/30 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors">
            <Sparkles className="h-3.5 w-3.5" />
            Gerar análise completa do período com IA
          </button>
        </div>
      )}

      {loading && (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded" style={{ width: `${90 - i * 8}%` }} />
          ))}
        </div>
      )}

      {error && <p className="text-xs text-primary">{error}</p>}

      {result && (
        <div className="space-y-5">
          {/* Diagnóstico */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/50">
            <p className="text-[11px] text-foreground/90 leading-relaxed">{result.diagnostico}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Destaques */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1">
                <Trophy className="h-3 w-3" /> Destaques
              </p>
              <ul className="space-y-2">
                {result.destaques.map((d, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-foreground/80">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />{d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Alertas */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1">
                <TriangleAlert className="h-3 w-3" /> Alertas
              </p>
              <ul className="space-y-2">
                {result.alertas.map((a, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-foreground/80">
                    <AlertCircle className="h-3 w-3 text-primary shrink-0 mt-0.5" />{a}
                  </li>
                ))}
              </ul>
            </div>

            {/* Ações */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gold mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Ações prioritárias
              </p>
              <ul className="space-y-2">
                {result.acoes.map((a, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-foreground/80">
                    <span className="text-gold font-bold shrink-0">{i + 1}.</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contexto setor */}
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">Contexto do setor</p>
            <p className="text-[11px] text-foreground/80">{result.contexto_setor}</p>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ── Aba Visão Geral ───────────────────────────────────────────────────────────

function VisaoGeral({ campaigns, loading }: { campaigns: EmailCampaign[]; loading: boolean }) {
  const totals = useMemo(() => {
    const comercial = campaigns.filter(c => c.type === "commercial");
    const news      = campaigns.filter(c => c.type === "news");
    const avg = (arr: EmailCampaign[], key: keyof EmailCampaign) =>
      arr.length > 0 ? arr.reduce((s, c) => s + (Number(c[key]) || 0), 0) / arr.length : 0;
    return {
      total: campaigns.length,
      totalComercial: comercial.length,
      totalNews: news.length,
      avgOpen:   avg(campaigns, "open_rate"),
      avgClick:  avg(campaigns, "click_rate"),
      avgBounce: avg(campaigns, "bounce_rate"),
      avgOpenC:  avg(comercial, "open_rate"),
      avgOpenN:  avg(news,      "open_rate"),
      avgClickC: avg(comercial, "click_rate"),
      avgClickN: avg(news,      "click_rate"),
      totalRecip: campaigns.reduce((s, c) => s + (c.recipients || 0), 0),
      abTests:   campaigns.filter(c => c.version !== "general").length,
    };
  }, [campaigns]);

  const monthlyData = useMemo(() => {
    const m: Record<string, { month: string; comercial: number[]; news: number[] }> = {};
    campaigns.forEach(c => {
      if (!c.sent_at) return;
      const key = c.sent_at.slice(0, 7);
      if (!m[key]) m[key] = { month: key, comercial: [], news: [] };
      if (c.type === "commercial") m[key].comercial.push(c.open_rate);
      else m[key].news.push(c.open_rate);
    });
    return Object.values(m)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(({ month, comercial, news }) => ({
        month: month.slice(5) + "/" + month.slice(2, 4),
        "Comercial": comercial.length > 0
          ? parseFloat((comercial.reduce((a, b) => a + b, 0) / comercial.length).toFixed(1))
          : null,
        "News": news.length > 0
          ? parseFloat((news.reduce((a, b) => a + b, 0) / news.length).toFixed(1))
          : null,
      }));
  }, [campaigns]);

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[90px] rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Campanhas no período" value={totals.total}
          subtitle={`${totals.totalComercial} comerciais · ${totals.totalNews} news`} icon={Mail} />
        <KPICard title="Abertura média" value={pct(totals.avgOpen)}
          subtitle={totals.avgOpen >= 30 ? "✓ acima do benchmark" : "⚠ benchmark: 30%"}
          trend={totals.avgOpen >= 30 ? "up" : "down"} icon={TrendingUp} />
        <KPICard title="Clique médio" value={pct(totals.avgClick)}
          subtitle={totals.avgClick >= 3 ? "✓ acima do benchmark" : "⚠ benchmark: 3%"}
          trend={totals.avgClick >= 3 ? "up" : "down"} icon={MousePointerClick} />
        <KPICard title="Total de destinatários" value={fmt(totals.totalRecip)}
          subtitle="Soma do período" icon={Users} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GlassCard>
          <SubTitle>Comercial vs News — abertura e clique</SubTitle>
          <div className="grid grid-cols-2 gap-6 mt-2">
            {[
              { label: "Comercial", open: totals.avgOpenC, click: totals.avgClickC, color: P },
              { label: "News",      open: totals.avgOpenN, click: totals.avgClickN, color: GOLD },
            ].map(({ label, open, click, color }) => (
              <div key={label}>
                <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>{pct(open)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">abertura</p>
                <p className="text-sm font-semibold mt-1">{pct(click)}</p>
                <p className="text-[10px] text-muted-foreground">clique</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SubTitle>Abertura média por mês</SubTitle>
          <ResponsiveContainer width="100%" height={110}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 9, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, "auto"]} />
              <Tooltip {...TT} formatter={(v: number) => pct(v)} />
              <Line type="monotone" dataKey="Comercial" stroke={P}    strokeWidth={2} dot={false} connectNulls />
              <Line type="monotone" dataKey="News"      stroke={GOLD} strokeWidth={2} dot={false} connectNulls />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </LineChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard title="Bounce médio"       value={pct(totals.avgBounce)}
          subtitle={totals.avgBounce <= 2 ? "✓ dentro do limite" : "⚠ acima de 2%"}
          trend={totals.avgBounce <= 2 ? "up" : "down"} icon={AlertCircle} />
        <KPICard title="Testes A/B"         value={totals.abTests}
          subtitle="Campanhas com variantes" icon={Layers} />
        <KPICard title="Melhor abertura"    value={pct(Math.max(...campaigns.map(c => c.open_rate), 0))}
          subtitle={campaigns.find(c => c.open_rate === Math.max(...campaigns.map(x => x.open_rate)))?.name?.slice(0,20) ?? ""} icon={Trophy} />
        <KPICard title="Score médio entrega" value={
          Math.round(campaigns.reduce((s, c) => s + calcDelivScore(c).score, 0) / (campaigns.length || 1))
        } subtitle="Entregabilidade geral /100" icon={Shield} />
      </div>

      {/* Análise IA do período */}
      <VisaoGeralAI campaigns={campaigns} totals={totals} />
    </div>
  );
}

// ── Aba Campanhas ─────────────────────────────────────────────────────────────

type SortKey = "sent_at" | "open_rate" | "click_rate" | "recipients" | "bounce_rate";

function Campanhas({
  campaigns,
  loading,
  onOpenCampaign,
}: {
  campaigns: EmailCampaign[];
  loading: boolean;
  onOpenCampaign: (c: EmailCampaign) => void;
}) {
  const [filterType, setFilterType]   = useState<"all" | "news" | "commercial">("all");
  const [sortKey, setSortKey]         = useState<SortKey>("sent_at");
  const [sortDir, setSortDir]         = useState<"asc" | "desc">("desc");
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [comparador, setComparador]   = useState(false);

  const sorted = useMemo(() => {
    const filtered = filterType === "all" ? campaigns : campaigns.filter(c => c.type === filterType);
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return sortDir === "desc" ? (av < bv ? 1 : -1) : (av > bv ? 1 : -1);
    });
  }, [campaigns, filterType, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedCampaigns = campaigns.filter(c => selected.has(c.id));

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
      {label}
      {sortKey === k
        ? sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
        : <ArrowUpDown className="h-3 w-3 opacity-40" />}
    </button>
  );

  if (loading) return <Skeleton className="h-64 rounded-xl" />;

  return (
    <div className="space-y-4">
      {/* Filtros + comparador */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "commercial", "news"] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
              filterType === t
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}>
            {t === "all" ? "Todas" : t === "commercial" ? "Comercial" : "News"}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-[10px] text-muted-foreground">{selected.size} selecionadas</span>
              {selected.size >= 2 && (
                <button onClick={() => setComparador(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground transition-all">
                  <GitCompare className="h-3 w-3" /> Comparar
                </button>
              )}
              <button onClick={() => setSelected(new Set())}
                className="text-[10px] text-muted-foreground hover:text-foreground">
                Limpar
              </button>
            </>
          )}
          <span className="text-[10px] text-muted-foreground">{sorted.length} campanhas</span>
        </div>
      </div>

      {/* Tabela */}
      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="px-4 py-2.5 w-8">
                  <input type="checkbox" className="accent-primary"
                    checked={selected.size === sorted.length && sorted.length > 0}
                    onChange={e => setSelected(e.target.checked ? new Set(sorted.map(c => c.id)) : new Set())} />
                </th>
                <th className="text-left px-3 py-2.5 font-medium">Campanha</th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="sent_at" label="Data" /></th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="recipients" label="Envios" /></th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="open_rate" label="Abertura" /></th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="click_rate" label="Clique" /></th>
                <th className="text-right px-3 py-2.5 font-medium"><SortBtn k="bounce_rate" label="Bounce" /></th>
                <th className="text-right px-3 py-2.5 font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => {
                const { score, level } = calcDelivScore(c);
                const scoreColor = level === "green" ? GREEN : level === "yellow" ? GOLD : P;
                return (
                  <tr key={c.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="accent-primary"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)} />
                    </td>
                    <td className="px-3 py-2.5 cursor-pointer" onClick={() => onOpenCampaign(c)}>
                      <div className="flex items-center gap-2">
                        <TypeBadge type={c.type} />
                        <span className="font-medium truncate max-w-[220px] hover:text-primary transition-colors">
                          {c.name}
                        </span>
                        {c.version !== "general" && (
                          <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-gold/15 text-gold">
                            {c.version}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right px-3 py-2.5 text-muted-foreground">
                      {c.sent_at ? new Date(c.sent_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                    </td>
                    <td className="text-right px-3 py-2.5">{fmt(c.recipients)}</td>
                    <td className={cn("text-right px-3 py-2.5 font-semibold",
                      c.open_rate >= 30 ? "text-emerald-400" :
                      c.open_rate >= 20 ? "text-gold" : "text-primary")}>
                      {pct(c.open_rate)}
                    </td>
                    <td className="text-right px-3 py-2.5">{pct(c.click_rate)}</td>
                    <td className={cn("text-right px-3 py-2.5",
                      c.bounce_rate > 2 ? "text-primary" : "text-muted-foreground")}>
                      {pct(c.bounce_rate)}
                    </td>
                    <td className="text-right px-3 py-2.5 font-bold" style={{ color: scoreColor }}>
                      {score}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {comparador && selectedCampaigns.length >= 2 && (
        <Comparador
          items={selectedCampaigns}
          onClose={() => setComparador(false)}
        />
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface Props { from: string; to: string; }

export function EmailMarketingSection({ from, to }: Props) {
  const [tab, setTab]                       = useState<EmailTab>("visao-geral");
  const [campaignPage, setCampaignPage]     = useState<EmailCampaign | null>(null);

  const { data: campaigns  = [], isLoading: loadingCampaigns } = useEmailCampaigns(from, to);

  const TABS = [
    { key: "visao-geral" as EmailTab, label: "Visão geral", Icon: TrendingUp },
    { key: "campanhas"   as EmailTab, label: "Campanhas",   Icon: Mail       },
  ];

  // Página de detalhe da campanha
  if (campaignPage) {
    return (
      <CampaignPage
        campaign={campaignPage}
        allCampaigns={campaigns}
        onBack={() => setCampaignPage(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl border border-border bg-card/40 w-fit">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
              tab === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}>
            <Icon className="h-3 w-3" />{label}
          </button>
        ))}
      </div>

      {tab === "visao-geral" && <VisaoGeral campaigns={campaigns} loading={loadingCampaigns} />}
      {tab === "campanhas"   && (
        <Campanhas
          campaigns={campaigns}
          loading={loadingCampaigns}
          onOpenCampaign={setCampaignPage}
        />
      )}
    </div>
  );
}
