// Motor compartilhado de "análise simulada" — gera uma análise estruturada
// (headline + pontos + riscos + recomendações), no mesmo formato que a IA
// real devolve, mas calculada localmente com lógica de threshold/comparação
// sobre os números já carregados na tela. Nunca inventa valores: cada frase
// referencia um campo real do payload recebido.
//
// Usado como fallback em:
// - AIAnalysisButton (seções genéricas: Vendas/KPIs, Funil)
// - EmailMarketingSection > CampaignAI (por campanha de email)
// - MarketingSection (Meta Ads, WhatsApp, Instagram)

export interface StructuredAnalysis {
  headline: string;
  pontos: string[];
  riscos: string[];
  recomendacoes: string[];
}

function formatNum(n: number): string {
  if (!isFinite(n)) return "0";
  return Math.abs(n) >= 1000
    ? n.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
    : n.toFixed(n % 1 === 0 ? 0 : 1);
}

function pickName(obj: Record<string, unknown>, fallback: string): string {
  const candidates = ["name", "nome", "funil", "produto", "campaign_name", "username", "tipo"];
  for (const c of candidates) {
    const v = (obj as any)[c];
    if (typeof v === "string" && v.trim()) return v;
  }
  return fallback;
}

const PERFORMANCE_FIELDS = [
  "valor", "totalVendido", "roas", "reach", "entregues", "likes", "like_count",
  "followers_count", "spend", "leads", "purchases", "eng", "engPorPost",
  "taxaEng", "lidos", "cpl", "ctr",
];

/**
 * Gera uma análise estruturada a partir de um payload arbitrário de métricas
 * (números/strings no topo) e listas de itens (arrays de objetos).
 */
export function gerarAnaliseSimuladaEstruturada(
  section: string,
  dataPayload: Record<string, unknown>
): StructuredAnalysis {
  const pontos: string[] = [];
  const riscos: string[] = [];
  const recomendacoes: string[] = [];

  const metricasNumericas = Object.entries(dataPayload).filter(
    ([, v]) => typeof v === "number"
  ) as [string, number][];

  const listas = Object.entries(dataPayload).filter(
    ([, v]) => Array.isArray(v) && (v as unknown[]).length > 0
  ) as [string, Record<string, unknown>[]][];

  // ── Headline ──────────────────────────────────────────────────────────
  let headline = `Não há dados suficientes carregados em "${section}" no período selecionado para um diagnóstico específico.`;
  if (metricasNumericas.length > 0) {
    const destaque = metricasNumericas.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a));
    headline = `No período analisado em "${section}", o indicador de maior magnitude foi "${destaque[0]}", em ${formatNum(destaque[1])}.`;
  } else if (listas.length > 0) {
    const [chave, itens] = listas[0];
    headline = `"${section}" reúne ${itens.length} registro(s) em "${chave}" no período selecionado — segue o detalhamento por item.`;
  }

  // ── Pontos positivos + riscos a partir de métricas numéricas isoladas ──
  // Heurística: campos com nomes que sugerem taxa/percentual comparados a
  // faixas de bom senso; campos crus (contagens, valores) viram "pontos".
  for (const [chave, valor] of metricasNumericas.slice(0, 8)) {
    const chaveLower = chave.toLowerCase();
    const ehTaxa = /taxa|rate|pct|percent|ctr|roas/.test(chaveLower);
    if (ehTaxa) {
      const negativa = /bounce|spam|unsub|descadastro|falha|cancelad/.test(chaveLower);
      if (negativa) {
        if (valor > 0) riscos.push(`"${chave}" está em ${formatNum(valor)} — vale monitorar para não crescer no próximo período.`);
      } else {
        pontos.push(`"${chave}" registrou ${formatNum(valor)} no período.`);
      }
    }
  }

  // ── Listas: melhor e pior desempenho ────────────────────────────────────
  for (const [chave, itens] of listas.slice(0, 3)) {
    const amostra = itens[0];
    if (!amostra || typeof amostra !== "object") continue;
    const campoNumerico =
      PERFORMANCE_FIELDS.find(c => typeof (amostra as any)[c] === "number") ??
      Object.keys(amostra).find(c => typeof (amostra as any)[c] === "number");
    if (!campoNumerico) continue;

    const comValor = itens.filter(it => typeof (it as any)[campoNumerico] === "number");
    if (comValor.length === 0) continue;
    const ordenado = [...comValor].sort((a: any, b: any) => (b[campoNumerico] ?? 0) - (a[campoNumerico] ?? 0));
    const melhor: any = ordenado[0];
    const pior: any = ordenado[ordenado.length - 1];

    const nomeMelhor = pickName(melhor, "item 1");
    pontos.push(
      `Em "${chave}", o destaque foi "${nomeMelhor}" — ${campoNumerico} de ${formatNum(melhor[campoNumerico])}, entre ${comValor.length} registro(s) analisado(s).`
    );

    if (ordenado.length > 1) {
      const nomePior = pickName(pior, "último item");
      const diferenca = melhor[campoNumerico] - pior[campoNumerico];
      if (diferenca > 0) {
        riscos.push(
          `Em "${chave}", "${nomePior}" ficou bem abaixo do restante — ${campoNumerico} de ${formatNum(pior[campoNumerico])}, contra ${formatNum(melhor[campoNumerico])} do melhor desempenho.`
        );
        recomendacoes.push(
          `Revisar "${nomePior}" em "${chave}" antes do próximo ciclo — é o ponto de maior distância em relação ao melhor resultado do grupo.`
        );
      }
    }
  }

  // ── Fallbacks para nunca devolver seções vazias ─────────────────────────
  if (pontos.length === 0) {
    pontos.push(`Os dados carregados em "${section}" não mostram nenhum destaque isolado claro neste período.`);
  }
  if (riscos.length === 0) {
    riscos.push(`Nenhum indicador em "${section}" ultrapassou os limites de atenção configurados neste período.`);
  }
  if (recomendacoes.length === 0) {
    recomendacoes.push(`Acompanhar a evolução de "${section}" no próximo período para identificar tendências antes de agir.`);
  }

  return {
    headline,
    pontos: pontos.slice(0, 3),
    riscos: riscos.slice(0, 2),
    recomendacoes: recomendacoes.slice(0, 2),
  };
}

// ── Fallback específico para campanhas de email (usa benchmarks nomeados) ──

export interface EmailCampaignLike {
  name: string;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  spam_rate: number;
  unsubscribe_rate: number;
  delivery_rate: number;
  recipients: number;
  subject?: string | null;
}

export function gerarAnaliseSimuladaEmail(campaign: EmailCampaignLike): StructuredAnalysis {
  const pontos: string[] = [];
  const riscos: string[] = [];
  const recomendacoes: string[] = [];

  const pct = (n: number) => `${n.toFixed(1)}%`;

  if (campaign.open_rate >= 30) {
    pontos.push(`Abertura de ${pct(campaign.open_rate)}, acima do benchmark de 25-35% do setor.`);
  } else if (campaign.open_rate >= 20) {
    pontos.push(`Abertura de ${pct(campaign.open_rate)}, dentro da faixa aceitável, mas com espaço para evoluir até o benchmark de 30%.`);
  } else {
    riscos.push(`Abertura de ${pct(campaign.open_rate)}, abaixo do benchmark de 25-35% do setor — o assunto e o horário de envio merecem revisão.`);
  }

  if (campaign.click_rate >= 3) {
    pontos.push(`Clique de ${pct(campaign.click_rate)}, acima do benchmark de 2-4%.`);
  } else if (campaign.click_rate > 0) {
    riscos.push(`Clique de ${pct(campaign.click_rate)}, abaixo do benchmark de 2-4% — o CTA do corpo do email pode estar pouco claro ou pouco atrativo.`);
  }

  if (campaign.bounce_rate > 2) {
    riscos.push(`Bounce de ${pct(campaign.bounce_rate)}, acima do limite recomendado de 2% — sinal de lista desatualizada.`);
    recomendacoes.push("Fazer uma limpeza de base antes do próximo disparo para reduzir o bounce.");
  } else {
    pontos.push(`Bounce de ${pct(campaign.bounce_rate)}, dentro do limite recomendado de 2%.`);
  }

  if (campaign.spam_rate > 0.1) {
    riscos.push(`Taxa de spam de ${pct(campaign.spam_rate)}, acima do limite de 0.1% — risco à reputação do domínio.`);
    recomendacoes.push("Revisar frequência de envio e segmentação para reduzir marcações como spam.");
  }

  if (campaign.unsubscribe_rate > 0.5) {
    riscos.push(`Descadastros em ${pct(campaign.unsubscribe_rate)}, acima do limite de 0.5%.`);
  }

  if (campaign.delivery_rate < 95) {
    riscos.push(`Entrega de ${pct(campaign.delivery_rate)}, abaixo do mínimo esperado de 95%.`);
    recomendacoes.push("Validar a saúde da lista de destinatários — a taxa de entrega está abaixo do esperado.");
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push(
      campaign.click_rate < 3
        ? "Testar um CTA mais direto no corpo do email na próxima campanha do mesmo tipo."
        : "Manter a linha editorial atual — os indicadores estão dentro ou acima dos benchmarks do setor."
    );
  }
  if (pontos.length === 0) {
    pontos.push(`Campanha com ${campaign.recipients.toLocaleString("pt-BR")} destinatários e entrega de ${pct(campaign.delivery_rate)}.`);
  }
  if (riscos.length === 0) {
    riscos.push("Nenhuma métrica ultrapassou os limites de atenção configurados para esta campanha.");
  }

  const headline = campaign.subject
    ? `Análise gerada localmente a partir das métricas da campanha "${campaign.name}" (assunto: "${campaign.subject}").`
    : `Análise gerada localmente a partir das métricas da campanha "${campaign.name}" — sem assunto disponível para análise textual.`;

  return {
    headline,
    pontos: pontos.slice(0, 3),
    riscos: riscos.slice(0, 2),
    recomendacoes: recomendacoes.slice(0, 2),
  };
}
