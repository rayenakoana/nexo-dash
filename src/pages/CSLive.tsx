import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendas } from "@/hooks/useVendas";
import { useConfiguracoes, useFunisVisiveis } from "@/hooks/useConfiguracoes";
import { ArrowLeft, TrendingUp, Trophy, Zap } from "lucide-react";
import { FUNIL_CORES } from "@/lib/funis";

const EMOJIS = ["🎉", "🔥", "💰", "🚀", "🏆", "⚡", "✨"];

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CSLive() {
  const { data: vendas = [] } = useVendas();
  const queryClient = useQueryClient();
  const { data: metaCfg = [] } = useConfiguracoes("Meta Venda Geral");
  const { data: funis = [] } = useConfiguracoes("Funil");
  const { funisVisiveis: FUNIS_ORDEM } = useFunisVisiveis();
  const [filterFunis, setFilterFunis] = useState<string[]>([]);
  const toggleFunil = (nome: string) => {
    setFilterFunis(prev => prev.includes(nome) ? prev.filter(f => f !== nome) : [...prev, nome]);
  };

  const now = new Date();
  const mesRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = `${mesRef}-01`;
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString().split("T")[0]; // último dia do mês atual

  const vendasDoMes = useMemo(
    () => vendas.filter(v =>
      v.status === "Fechado" &&
      v.data_fechamento &&
      v.data_fechamento >= monthStart &&
      v.data_fechamento <= monthEnd &&
      (filterFunis.length === 0 || filterFunis.includes(v.funil))
    ),
    [vendas, monthStart, monthEnd, filterFunis]
  );
  const faturamento = vendasDoMes.reduce((s, v) => s + Number(v.valor), 0);
  const totalVendas = vendasDoMes.length;

  const meta = useMemo(() => {
    const item = (metaCfg as any[]).find((m) => m.mes_ref === mesRef);
    return item ? Number(item.valor) || 0 : (metaCfg[0] ? Number(metaCfg[0].valor) : 0);
  }, [metaCfg, mesRef]);
  const pctMeta = meta > 0 ? Math.min(100, (faturamento / meta) * 100) : 0;

  // Leads do dia por funil
  const [leadsHoje, setLeadsHoje] = useState<Record<string, number>>({});
  const totalLeadsHoje = FUNIS_ORDEM.reduce((s, f) => s + (leadsHoje[f] ?? 0), 0);

  const hoje = new Date().toISOString().split("T")[0];

  async function fetchLeadsHoje() {
    const { data } = await supabase
      .from("leads_diarios_por_funil")
      .select("funil, total_leads")
      .eq("data", hoje);
    if (data) {
      const map: Record<string, number> = {};
      data.forEach((row: any) => { map[row.funil] = row.total_leads; });
      setLeadsHoje(map);
    }
  }

  useEffect(() => {
    fetchLeadsHoje();
    // Atualiza a cada 30 segundos
    const interval = setInterval(fetchLeadsHoje, 30000);
    return () => clearInterval(interval);
  }, []);

  // Detect new sales
  const knownIds = useRef<Set<string>>(new Set());
  const [pop, setPop] = useState<{ emoji: string; key: number } | null>(null);
  const [pulse, setPulse] = useState(false);
  const initialized = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const metaAudioRef = useRef<HTMLAudioElement | null>(null);
  const [metaHit, setMetaHit] = useState(false);
  const [dinheiro, setDinheiro] = useState<{ id: number; left: number; delay: number; emoji: string }[]>([]);
  const metaJaComemorada = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      vendasDoMes.forEach(v => knownIds.current.add(v.id));
      initialized.current = true;
      return;
    }
    const newOnes = vendasDoMes.filter(v => !knownIds.current.has(v.id));
    if (newOnes.length === 0) return;
    newOnes.forEach(v => {
      knownIds.current.add(v.id);
      celebrate(Number(v.valor));
    });
  }, [vendasDoMes]);

  // Realtime: avisa esta tela sempre que uma venda for inserida/atualizada
  // em QUALQUER dispositivo (não só na aba que fez a alteração).
  useEffect(() => {
    const channel = supabase
      .channel("cs-live-vendas")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["vendas"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  function celebrate(valor: number) {
    // Confetti burst
    confetti({
      particleCount: 140,
      spread: 90,
      origin: { y: 0.6 },
      colors: ["#3B82F6", "#22D3EE", "#ffffff", "#2563EB"],
    });
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 }, colors: ["#3B82F6", "#22D3EE", "#ffffff", "#2563EB"] }), 200);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 }, colors: ["#3B82F6", "#22D3EE", "#ffffff", "#2563EB"] }), 400);

    // Emoji pop
    setPop({ emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)], key: Date.now() });
    setTimeout(() => setPop(null), 2200);

    // Counter pulse
    setPulse(true);
    setTimeout(() => setPulse(false), 700);

    // Toast
    toast.success(`🎉 Nova venda: ${formatBRL(valor)}!`, { duration: 6000 });

    // Sound (silent fallback if file missing)
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play().catch(() => {});
      }
    } catch { /* ignore */ }
  }

  // Demo trigger (manual celebration) for QA
  function demoTrigger() { celebrate(15000); }

  function celebrarMeta() {
    // Confete dourado em múltiplas rajadas, mais intensas e demoradas que a comemoração normal
    const cores = ["#FFD700", "#FFF4C2", "#FFC700", "#ffffff", "#FF8E00"];
    const rajada = (delay: number, particleCount: number, spread: number, x: number) =>
      setTimeout(() => confetti({ particleCount, spread, origin: { x, y: 0.5 }, colors: cores, gravity: 0.7, scalar: 1.1 }), delay);
    rajada(0, 220, 100, 0.5);
    rajada(300, 140, 70, 0.15);
    rajada(300, 140, 70, 0.85);
    rajada(900, 180, 90, 0.5);
    rajada(1400, 120, 70, 0.25);
    rajada(1400, 120, 70, 0.75);
    rajada(2200, 180, 100, 0.5);
    rajada(3200, 150, 100, 0.5);
    rajada(4500, 150, 100, 0.5);
    rajada(6000, 150, 100, 0.5);
    // Segundo ciclo (acompanha a repetição da moto + fogos no áudio, por volta dos 9.5s)
    rajada(9500, 220, 100, 0.5);
    rajada(9800, 140, 70, 0.15);
    rajada(9800, 140, 70, 0.85);
    rajada(10400, 180, 90, 0.5);
    rajada(10900, 120, 70, 0.25);
    rajada(10900, 120, 70, 0.75);
    rajada(11700, 180, 100, 0.5);
    rajada(12700, 150, 100, 0.5);
    rajada(14000, 150, 100, 0.5);
    rajada(15500, 150, 100, 0.5);
    rajada(17000, 150, 100, 0.5);

    // Chuva de dinheiro
    const emojis = ["💰", "💵", "💸"];
    const gotas = Array.from({ length: 55 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      delay: Math.random() * 17,
      emoji: emojis[i % emojis.length],
    }));
    setDinheiro(gotas);
    setTimeout(() => setDinheiro([]), 19000);

    setMetaHit(true);
    setTimeout(() => setMetaHit(false), 19000);

    toast.success("🏆 META BATIDA!!!!", { duration: 8000 });

    try {
      if (metaAudioRef.current) {
        metaAudioRef.current.currentTime = 0;
        void metaAudioRef.current.play().catch(() => {});
      }
    } catch { /* ignore */ }
  }

  const primeiraChecagemMeta = useRef(true);

  useEffect(() => {
    if (meta <= 0) return;

    // Na primeira checagem (abertura/recarga da página), só registra o estado atual
    // sem disparar a comemoração — ela só deve tocar quando a meta é batida "ao vivo".
    if (primeiraChecagemMeta.current) {
      primeiraChecagemMeta.current = false;
      metaJaComemorada.current = faturamento >= meta;
      return;
    }

    if (!metaJaComemorada.current && faturamento >= meta) {
      metaJaComemorada.current = true;
      celebrarMeta();
    }
    if (faturamento < meta) {
      metaJaComemorada.current = false;
    }
  }, [faturamento, meta]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 md:p-16 relative overflow-hidden">
      {/* audio with silent fallback */}
      <audio ref={audioRef} src="/sounds/applause.mp3" preload="auto" />
      <audio ref={metaAudioRef} src="/sounds/celebracao_meta.mp3" preload="auto" />

      {/* Fundo dourado persistente enquanto a meta estiver batida (substitui o brilho ambiente vermelho) */}
      {meta > 0 && faturamento >= meta && (
        <div
          className="pointer-events-none fixed inset-0 z-20 transition-opacity duration-700"
          style={{
            background:
              "radial-gradient(ellipse 60% 45% at 20% 15%, rgba(255,215,0,0.5), transparent 60%)," +
              "radial-gradient(ellipse 50% 40% at 85% 85%, rgba(255,215,0,0.45), transparent 65%)," +
              "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(255,215,0,0.35), transparent 70%)",
          }}
        />
      )}

      {/* Chuva de dinheiro */}
      {dinheiro.map((d) => (
        <div
          key={d.id}
          className="pointer-events-none fixed top-0 z-30 text-4xl md:text-5xl"
          style={{
            left: `${d.left}%`,
            animation: `meta-cair 3.5s linear ${d.delay}s 1`,
          }}
        >
          {d.emoji}
        </div>
      ))}

      {/* Faixa META BATIDA passando na horizontal (estilo faixa dourada) */}
      {metaHit && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 -translate-y-1/2 z-30 overflow-hidden">
          <div
            className="whitespace-nowrap font-display font-bold text-5xl md:text-7xl py-6"
            style={{
              color: "#3c3406",
              background: "linear-gradient(90deg, rgba(255,215,0,0.95), rgba(255,193,7,0.95))",
              boxShadow: "0 0 60px rgba(255,215,0,0.5)",
              animation: "meta-scroll 3s linear forwards",
            }}
          >
            META BATIDA!!!! &nbsp;&nbsp;&nbsp; META BATIDA!!!! &nbsp;&nbsp;&nbsp; META BATIDA!!!! &nbsp;&nbsp;&nbsp; META BATIDA!!!!
          </div>
        </div>
      )}

      {/* Texto META BATIDA gigante centralizado, piscando */}
      {metaHit && (
        <div
          className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center"
          style={{ animation: "meta-blink-in 1s step-start 3s forwards" }}
        >
          <div
            className="font-display font-bold text-7xl md:text-9xl text-center px-4"
            style={{
              color: "#FFD700",
              textShadow: "0 0 50px rgba(255,215,0,0.8), 0 0 100px rgba(255,215,0,0.5)",
              animation: "meta-blink 1s step-start 3s 16",
            }}
          >
            META BATIDA
          </div>
        </div>
      )}
      <style>{`
        @keyframes meta-scroll {
          from { transform: translateX(100vw); }
          to { transform: translateX(-100%); }
        }
        @keyframes meta-blink-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes meta-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes meta-cair {
          from { transform: translateY(-60px); opacity: 1; }
          to { transform: translateY(105vh); opacity: 0.9; }
        }
      `}</style>

      {/* back link */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm z-10"
      >
        <ArrowLeft className="h-4 w-4" /> Sair do modo Live
      </Link>

      <button
        onClick={demoTrigger}
        className="absolute top-6 right-6 text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground z-10"
      >
        <Zap className="inline h-3 w-3 mr-1" /> Testar comemoração
      </button>

      <button
        onClick={celebrarMeta}
        className="absolute top-6 right-48 text-xs px-3 py-2 rounded-lg border border-gold text-gold hover:bg-gold/10 z-10"
      >
        <Trophy className="inline h-3 w-3 mr-1" /> Testar meta batida
      </button>

      {/* Emoji pop */}
      {pop && (
        <div
          key={pop.key}
          className="pointer-events-none fixed inset-0 flex items-center justify-center z-30"
        >
          <div className="text-[12rem] animate-count-pop drop-shadow-[0_0_40px_rgba(232,25,44,0.6)]">
            {pop.emoji}
          </div>
        </div>
      )}



      {/* Header */}
      <div className="text-center mb-12 z-10">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-muted-foreground mb-3">
          CS Dash · Live
        </div>
        <h1 className="font-display font-bold text-5xl md:text-7xl tracking-wide">
          <span className="text-gradient">FATURAMENTO</span>{" "}
          <span className="text-foreground">EM TEMPO REAL</span>
        </h1>
      </div>

      {/* Main counter */}
      <div className="text-center mb-16 z-10">
        <div
          className={`font-display font-bold text-7xl md:text-[10rem] leading-none tracking-tight transition-all ${
            pulse ? "animate-count-pop text-gradient-gold" : "text-foreground"
          }`}
        >
          {formatBRL(faturamento)}
        </div>
        <div className="mt-6 flex items-center justify-center gap-6 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-gold" />
            <span className="font-display text-2xl text-foreground">{totalVendas}</span>
            <span className="text-sm">vendas no mês</span>
          </div>
          <div className="w-px h-6 bg-border" />
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-display text-2xl text-foreground">{pctMeta.toFixed(1)}%</span>
            <span className="text-sm">da meta</span>
          </div>
        </div>
      </div>

      {/* Meta gauge (bar) */}
      <div className="w-full max-w-4xl z-10">
        <div className="flex justify-between items-baseline mb-3">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Meta do mês</span>
          <span className="font-display text-lg text-gold">{formatBRL(meta)}</span>
        </div>
        <div className="relative h-6 rounded-full bg-muted/40 border border-border overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 animate-pulse-glow transition-all duration-700 ${
              meta > 0 && faturamento >= meta ? "bg-gradient-to-r from-[#C9A017] to-[#FFD700]" : "bg-gradient-red"
            }`}
            style={{ width: `${pctMeta}%` }}
          />
          {/* gold marker */}
          <div className="absolute inset-y-0 right-0 w-1 bg-gold" />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>R$ 0</span>
          <span>{pctMeta.toFixed(1)}% atingido</span>
          <span>{formatBRL(meta)}</span>
        </div>
        {meta > 0 && (
          <div className={`text-center mt-3 ${faturamento >= meta ? "text-gold text-xl font-bold" : "text-sm text-primary/80"}`}>
            {faturamento >= meta
              ? "🎉 Meta batida!"
              : `Faltam ${formatBRL(meta - faturamento)} para bater a meta`}
          </div>
        )}
      </div>

      {/* Divisória */}
      <div className="w-full max-w-4xl border-t border-border/40 my-10 z-10" />

      {/* Bloco de leads do dia */}
      <div className="w-full max-w-4xl z-10 flex flex-col items-center gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Leads recebidos hoje
          </span>
          <span className="bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-widest animate-pulse">
            LIVE
          </span>
        </div>

        {/* Número total */}
        <div className="flex flex-col items-center gap-1">
          <div className="font-display font-bold text-7xl md:text-8xl leading-none text-primary"
            style={{ textShadow: "0 0 40px rgba(232,25,44,0.35)" }}>
            {totalLeadsHoje}
          </div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            leads hoje
          </div>
        </div>

        {/* Grid de funis */}
        <div className="grid grid-cols-6 gap-3 w-full">
          {FUNIS_ORDEM.map((funil) => {
            const cor = FUNIL_CORES[funil] ?? "#666";
            const count = leadsHoje[funil] ?? 0;
            return (
              <div
                key={funil}
                className="flex flex-col items-center gap-2 bg-card/60 border border-border rounded-xl p-3 text-center"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: cor }}
                />
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight min-h-[28px] flex items-center justify-center">
                  {funil}
                </div>
                <div
                  className="font-display font-bold text-3xl leading-none"
                  style={{ color: cor }}
                >
                  {count}
                </div>
                <div className="text-[9px] uppercase tracking-widest text-muted-foreground/50">
                  leads
                </div>
              </div>
            );
          })}
        </div>

        {/* Rodapé atualização */}
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground/30">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Atualiza automaticamente em tempo real
        </div>
      </div>
    </div>
  );
}
