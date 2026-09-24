import { useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SYSTEM_PROMPT = [
  "Você é um analista comercial especializado em educação empresarial e consultoria de negócios, trabalhando para a Nexo Dash.",
  "",
  "## Sobre a Nexo Dash",
  "- Empresa de treinamento e consultoria para empreendedores e gestores de negócios",
  "- Produtos de alto valor com foco em expansão, operações e crescimento empresarial",
  "- Metodologia própria com pilares: Comercial, Operações, Financeiro, Processos e Recorrência",
  "",
  "## Produtos e funis",
  "- Imersão Premium: imersão presencial 3 dias. Ticket: R$ 8.000. Ciclo médio: 8-15 dias.",
  "- Workshop: treinamento presencial 2 dias. Ticket: R$ 3.000-4.000. Ciclo médio: 4-8 dias.",
  "- Membership: assinatura recorrente. Maior LTV e renovação.",
  "- Consultoria: projeto personalizado. Ticket variável.",
  "- Expansão: programa de expansão de mercado. Ticket: R$ 8.000.",
  "",
  "## Metas e benchmarks",
  "- Agendamento (lead para reunião): meta 50%",
  "- Show-up (agendado para compareceu): meta 70%",
  "- Fechamento (proposta para venda): meta 30%",
  "- Ticket médio esperado: R$ 6.500-7.000",
  "",
  "## Regras ABSOLUTAS",
  "1. Todos os números DEVEM vir dos dados fornecidos. Nunca estime ou invente valores.",
  "2. Se um dado não foi fornecido, diga que não tem esse dado disponível.",
  "3. Máximo 3 insights, do mais crítico ao menos crítico.",
  "4. Sem bullet points. Texto corrido, parágrafos curtos, linguagem direta.",
  "5. Tom de analista experiente, não de chatbot genérico.",
  "6. Não elogie os dados nem seja motivacional. Seja direto e analítico.",
].join("\n");

interface AIAnalysisButtonProps {
  section: string;
  dataPayload: Record<string, unknown>;
  className?: string;
}

// Fallback local, sem chamada de rede: gera uma análise "template-based" a
// partir dos números já carregados na tela (dataPayload), para que o botão
// nunca fique quebrado/vazio quando a IA real falhar (sem VITE_ANTHROPIC_API_KEY,
// sem rede, timeout, resposta inesperada da API etc). Deixado claramente
// rotulado como simulado — não inventa nenhum número, só descreve o que já
// está no payload.
function formatNum(n: number): string {
  if (!isFinite(n)) return "0";
  return Math.abs(n) >= 1000 ? n.toLocaleString("pt-BR", { maximumFractionDigits: 0 }) : n.toFixed(n % 1 === 0 ? 0 : 1);
}

function gerarAnaliseSimulada(section: string, dataPayload: Record<string, unknown>): string {
  const frases: string[] = [];

  // 1) Métricas simples (número/string) no topo do payload
  const metricas = Object.entries(dataPayload).filter(
    ([, v]) => typeof v === "number" || typeof v === "string"
  ) as [string, number | string][];
  const metricasNumericas = metricas.filter(([, v]) => typeof v === "number") as [string, number][];

  if (metricasNumericas.length > 0) {
    const destaque = metricasNumericas.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
    frases.push(`O indicador de maior magnitude no período foi "${destaque[0]}", em ${formatNum(destaque[1])}.`);
  }

  // 2) Listas de itens (campanhas, posts, canais...) — acha o de melhor/pior desempenho
  //    olhando o primeiro campo numérico "de desempenho" comum (valor, spend, reach, entregues, ctr, roas...)
  const camposPreferidos = ["valor", "totalVendido", "roas", "reach", "entregues", "likes", "like_count", "followers_count", "spend", "leads", "purchases"];
  const listas = Object.entries(dataPayload).filter(([, v]) => Array.isArray(v) && (v as unknown[]).length > 0) as [string, Record<string, unknown>[]][];

  for (const [chave, itens] of listas.slice(0, 3)) {
    const amostra = itens[0];
    if (!amostra || typeof amostra !== "object") continue;
    const campoNumerico = camposPreferidos.find(c => typeof (amostra as any)[c] === "number")
      ?? Object.keys(amostra).find(c => typeof (amostra as any)[c] === "number");
    if (!campoNumerico) continue;

    const ordenado = [...itens].sort((a: any, b: any) => (b[campoNumerico] ?? 0) - (a[campoNumerico] ?? 0));
    const melhor: any = ordenado[0];
    const nomeCampo = (melhor.name ?? melhor.nome ?? melhor.funil ?? melhor.produto ?? melhor.campaign_name ?? melhor.username ?? "item 1");
    if (melhor) {
      frases.push(`Em "${chave}", o destaque foi "${nomeCampo}", com ${campoNumerico} de ${formatNum(melhor[campoNumerico])} — ${itens.length} registro(s) analisado(s) no total.`);
    }
  }

  if (frases.length === 0) {
    frases.push(`Não há dados suficientes carregados em "${section}" no período selecionado para destacar um padrão específico.`);
  }

  frases.push("Esta é uma análise gerada localmente a partir dos números já exibidos na tela — recomenda-se revisão humana antes de decisões comerciais.");

  return frases.join(" ");
}

export function AIAnalysisButton({ section, dataPayload, className }: AIAnalysisButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [simulado, setSimulado] = useState(false);
  const [error, setError] = useState<string>("");

  async function runAnalysis() {
    if (analysis) { setOpen(true); return; }
    setOpen(true);
    setLoading(true);
    setError("");
    setSimulado(false);

    const userMessage = "Analise a seção \"" + section + "\" com os seguintes dados reais do período selecionado:\n\n" + JSON.stringify(dataPayload, null, 2);
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY ?? "";

    // Sem chave configurada: nem tenta a rede, cai direto no fallback simulado.
    if (!apiKey) {
      setAnalysis(gerarAnaliseSimulada(section, dataPayload));
      setSimulado(true);
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const text = json?.content?.[0]?.text ?? "";
      if (!text) throw new Error("Resposta vazia da IA");
      setAnalysis(text);
    } catch {
      // Qualquer falha (sem rede, chave inválida, timeout, resposta inesperada)
      // cai num fallback local — nunca deixa o botão sem resultado nenhum.
      setAnalysis(gerarAnaliseSimulada(section, dataPayload));
      setSimulado(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={runAnalysis}
        className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1.5 rounded-full border border-primary/30 text-primary/80 hover:bg-primary/10 hover:border-primary/60 transition-all"
      >
        <Sparkles className="h-3 w-3" />
        Analisar
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Análise IA</span>
              {simulado && !loading && (
                <span className="text-[8px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                  Simulada
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Analisando dados...
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          {!loading && analysis && (
            <div className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">{analysis}</div>
          )}

          {!loading && analysis && (
            <button
              onClick={() => { setAnalysis(""); setSimulado(false); runAnalysis(); }}
              className="mt-3 text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              Reanalisar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
