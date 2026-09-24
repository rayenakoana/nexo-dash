import { useState } from "react";
import { Sparkles, X, Loader2, CheckCircle2, AlertCircle, TriangleAlert, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { gerarAnaliseSimuladaEstruturada, StructuredAnalysis } from "@/lib/simulatedAnalysis";

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

// Fallback local, sem chamada de rede: gera uma análise estruturada
// "template-based" a partir dos números já carregados na tela (dataPayload),
// para que o botão nunca fique quebrado/vazio quando a IA real falhar (sem
// VITE_ANTHROPIC_API_KEY, sem rede, timeout, resposta inesperada da API etc).
// Deixado claramente rotulado como simulado — não inventa nenhum número, só
// descreve o que já está no payload. Lógica compartilhada em
// src/lib/simulatedAnalysis.ts.

export function AIAnalysisButton({ section, dataPayload, className }: AIAnalysisButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>("");
  const [structured, setStructured] = useState<StructuredAnalysis | null>(null);
  const [simulado, setSimulado] = useState(false);
  const [error, setError] = useState<string>("");

  async function runAnalysis() {
    if (analysis || structured) { setOpen(true); return; }
    setOpen(true);
    setLoading(true);
    setError("");
    setSimulado(false);

    const userMessage = "Analise a seção \"" + section + "\" com os seguintes dados reais do período selecionado:\n\n" + JSON.stringify(dataPayload, null, 2);
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY ?? "";

    // Sem chave configurada: nem tenta a rede, cai direto no fallback simulado.
    if (!apiKey) {
      setStructured(gerarAnaliseSimuladaEstruturada(section, dataPayload));
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
      setStructured(gerarAnaliseSimuladaEstruturada(section, dataPayload));
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

          {!loading && structured && (
            <div className="space-y-4">
              <p className="text-[11px] text-foreground/90 leading-relaxed">{structured.headline}</p>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1">
                  <Trophy className="h-3 w-3" /> Pontos positivos
                </p>
                <ul className="space-y-1">
                  {structured.pontos.map((p, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-foreground/80">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1">
                  <TriangleAlert className="h-3 w-3" /> Pontos de atenção
                </p>
                <ul className="space-y-1">
                  {structured.riscos.map((r, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-foreground/80">
                      <AlertCircle className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-gold mb-1.5 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Recomendações
                </p>
                <ul className="space-y-1">
                  {structured.recomendacoes.map((rec, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-foreground/80">
                      <span className="text-gold font-bold shrink-0">{i + 1}.</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {!loading && (analysis || structured) && (
            <button
              onClick={() => { setAnalysis(""); setStructured(null); setSimulado(false); runAnalysis(); }}
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
