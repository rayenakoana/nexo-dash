import { useState, useMemo, useRef, useEffect } from "react";
import * as d3 from "d3-geo";
import { feature } from "topojson-client";
import { GlassCard } from "@/components/GlassCard";
import { useLeadsGeografia } from "@/hooks/useLeadsGeografia";
import { useFunisVisiveis } from "@/hooks/useConfiguracoes";
import { Globe2, MapPin, ArrowLeft, Download } from "lucide-react";
import { PIPELINE_IDS } from "@/lib/funis";

// Nomes dos países como aparecem no world-countries.json (Natural Earth) vs. nomes que usamos internamente
const NOME_PAIS_MAPA: Record<string, string> = {
  "Brasil": "Brazil",
  "Paraguai": "Paraguay",
  "Uruguai": "Uruguay",
  "Bolívia": "Bolivia",
  "Equador": "Ecuador",
  "Argentina": "Argentina",
  "Chile": "Chile",
  "Colômbia": "Colombia",
  "Venezuela": "Venezuela",
  "Peru": "Peru",
  "Portugal": "Portugal",
  "Espanha": "Spain",
  "Itália": "Italy",
  "Alemanha": "Germany",
  "França": "France",
  "Reino Unido": "United Kingdom",
  "Estados Unidos/Canadá": "United States of America",
};

type View = "mundo" | "estados" | "cidades";

export default function MapaGeografico() {
  const { data: rows = [], isLoading } = useLeadsGeografia();
  const { funisVisiveis: FUNIS } = useFunisVisiveis();
  const [funisSel, setFunisSel] = useState<string[]>([]);
  const [view, setView] = useState<View>("mundo");
  const [estadoSelecionado, setEstadoSelecionado] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ nome: string; leads: number; x: number; y: number } | null>(null);

  const todosSelecionados = funisSel.length === 0;
  const pipelineIdsFiltrados = funisSel.map(f => PIPELINE_IDS[f]);

  const rowsFiltradas = useMemo(() => {
    if (todosSelecionados) return rows;
    return rows.filter(r => r.pipeline_id && pipelineIdsFiltrados.includes(r.pipeline_id));
  }, [rows, todosSelecionados, pipelineIdsFiltrados]);

  // === Agregações ===
  const porPais = useMemo(() => {
    const map: Record<string, number> = {};
    rowsFiltradas.forEach(r => {
      const p = r.pais || "Não identificado";
      map[p] = (map[p] || 0) + 1;
    });
    return map;
  }, [rowsFiltradas]);

  const porEstado = useMemo(() => {
    const map: Record<string, { leads: number; uf: string }> = {};
    rowsFiltradas.forEach(r => {
      if (r.pais !== "Brasil" || !r.estado) return;
      if (!map[r.estado]) map[r.estado] = { leads: 0, uf: r.uf || "" };
      map[r.estado].leads += 1;
    });
    return map;
  }, [rowsFiltradas]);

  const cidadesDoEstado = useMemo(() => {
    if (!estadoSelecionado) return [];
    const map: Record<string, number> = {};
    let semCidade = 0;
    rowsFiltradas.forEach(r => {
      if (r.estado !== estadoSelecionado) return;
      if (r.cidade && r.cidade.trim()) {
        map[r.cidade] = (map[r.cidade] || 0) + 1;
      } else {
        semCidade++;
      }
    });
    const arr = Object.entries(map).map(([nome, leads]) => ({ nome, leads })).sort((a, b) => b.leads - a.leads);
    if (semCidade > 0) arr.push({ nome: "Cidade não informada", leads: semCidade });
    return arr;
  }, [rowsFiltradas, estadoSelecionado]);

  const totalGeral = rowsFiltradas.length;
  const totalBrasil = porPais["Brasil"] || 0;
  const totalInternacional = totalGeral - totalBrasil - (porPais["Não identificado"] || 0);
  const naoIdentificado = porPais["Não identificado"] || 0;

  const paisesInternacionais = useMemo(() => {
    return Object.entries(porPais)
      .filter(([nome]) => nome !== "Brasil" && nome !== "Não identificado")
      .sort(([, a], [, b]) => b - a);
  }, [porPais]);

  const estadosRanking = useMemo(() => {
    return Object.entries(porEstado)
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.leads - a.leads);
  }, [porEstado]);

  // === Exportar relatório CSV ===
  function exportarCSV() {
    const linhas = [["Tipo", "Nome", "Leads"]];
    linhas.push(["País", "Brasil", String(totalBrasil)]);
    paisesInternacionais.forEach(([nome, leads]) => linhas.push(["País", nome, String(leads)]));
    estadosRanking.forEach(e => linhas.push(["Estado (BR)", e.nome, String(e.leads)]));
    if (estadoSelecionado) {
      cidadesDoEstado.forEach(c => linhas.push([`Cidade (${estadoSelecionado})`, c.nome, String(c.leads)]));
    }
    const csv = linhas.map(l => l.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-leads-geografico-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mapa Geográfico</h1>
          <p className="text-sm text-muted-foreground">Origem dos leads por país, estado e cidade</p>
        </div>
        <button
          onClick={exportarCSV}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border hover:border-primary/50 transition-colors self-start md:self-auto"
        >
          <Download className="h-4 w-4" /> Exportar relatório (CSV)
        </button>
      </div>

      {/* Filtro de funis */}
      <div className="flex gap-2 flex-wrap">
        <button className={`fchip ${todosSelecionados ? "active" : ""}`} onClick={() => setFunisSel([])}>
          Todos os funis
        </button>
        {FUNIS.map(f => (
          <button
            key={f}
            className={`fchip ${funisSel.includes(f) ? "active" : ""}`}
            onClick={() => setFunisSel(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])}
          >
            {f}
          </button>
        ))}
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Total de leads geolocalizados</p>
          <p className="text-2xl font-semibold">{isLoading ? "—" : totalGeral}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Brasil</p>
          <p className="text-2xl font-semibold text-primary">{isLoading ? "—" : totalBrasil}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Internacional</p>
          <p className="text-2xl font-semibold text-gold">{isLoading ? "—" : totalInternacional}</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Não identificado</p>
          <p className="text-2xl font-semibold text-muted-foreground">{isLoading ? "—" : naoIdentificado}</p>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa */}
        <GlassCard className="p-6 lg:col-span-2 min-h-[420px]">
          <div className="flex items-center gap-2 mb-3">
            {view !== "mundo" && (
              <button
                onClick={() => { if (view === "cidades") { setView("estados"); setEstadoSelecionado(null); } else { setView("mundo"); } }}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> voltar
              </button>
            )}
            <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              {view === "mundo" && <><Globe2 className="h-3.5 w-3.5" /> Mundo</>}
              {view === "estados" && <><MapPin className="h-3.5 w-3.5" /> Brasil · estados</>}
              {view === "cidades" && <><MapPin className="h-3.5 w-3.5" /> {estadoSelecionado}</>}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-80 text-sm text-muted-foreground">Carregando dados...</div>
          ) : view === "mundo" ? (
            <WorldMap porPais={porPais} onClickBrasil={() => setView("estados")} onHover={setHoverInfo} />
          ) : view === "estados" ? (
            <BrazilMap
              porEstado={porEstado}
              onClickEstado={(nome) => { setEstadoSelecionado(nome); setView("cidades"); }}
              onHover={setHoverInfo}
            />
          ) : (
            <CidadesList cidades={cidadesDoEstado} />
          )}
        </GlassCard>

        {/* Painel lateral / relatório */}
        <div className="space-y-4">
          <GlassCard className="p-5">
            <p className="text-sm font-medium mb-3">Top estados (Brasil)</p>
            {estadosRanking.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados no período/filtro selecionado</p>
            ) : (
              <div className="space-y-2.5">
                {estadosRanking.slice(0, 10).map(e => {
                  const max = estadosRanking[0]?.leads || 1;
                  return (
                    <button
                      key={e.nome}
                      onClick={() => { setEstadoSelecionado(e.nome); setView("cidades"); }}
                      className="w-full text-left group"
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className="group-hover:text-primary transition-colors">{e.nome}</span>
                        <span className="text-muted-foreground">{e.leads}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div className="h-full bg-gradient-red rounded-full" style={{ width: `${(e.leads / max) * 100}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-sm font-medium mb-3">Leads internacionais</p>
            {paisesInternacionais.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum lead internacional no período/filtro</p>
            ) : (
              <div className="space-y-2">
                {paisesInternacionais.map(([nome, leads]) => (
                  <div key={nome} className="flex justify-between text-sm">
                    <span>{nome}</span>
                    <span className="text-gold font-medium">{leads}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function useMapZoomPan() {
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => ({ ...t, scale: Math.min(8, Math.max(1, t.scale * delta)) }));
  };
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: transform.x, origY: transform.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.startX;
    const dy = e.clientY - dragging.current.startY;
    setTransform(t => ({ ...t, x: dragging.current!.origX + dx, y: dragging.current!.origY + dy }));
  };
  const onMouseUp = () => { dragging.current = null; };
  const reset = () => setTransform({ scale: 1, x: 0, y: 0 });

  return { transform, onWheel, onMouseDown, onMouseMove, onMouseUp, reset };
}

function ZoomHint({ onReset }: { onReset: () => void }) {
  return (
    <button
      onClick={onReset}
      className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded-md bg-background/70 border border-border text-muted-foreground hover:text-foreground backdrop-blur"
    >
      resetar zoom
    </button>
  );
}

// ============================================================
// Mapa mundial
// ============================================================
function WorldMap({ porPais, onClickBrasil, onHover }: { porPais: Record<string, number>; onClickBrasil: () => void; onHover: (i: any) => void }) {
  const [geo, setGeo] = useState<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, onWheel, onMouseDown, onMouseMove, onMouseUp, reset } = useMapZoomPan();

  useEffect(() => {
    fetch("/geo/world-countries.json")
      .then(r => r.json())
      .then(topo => {
        const key = Object.keys(topo.objects)[0];
        const fc = feature(topo, topo.objects[key]) as any;
        setGeo(fc.features);
      })
      .catch(() => setGeo([]));
  }, []);

  const width = 640, height = 360;
  const projection = d3.geoNaturalEarth1().scale(105).translate([width / 2, height / 2 + 20]);
  const path = d3.geoPath(projection as any);

  const nomeParaPtbr = useMemo(() => {
    const inv: Record<string, string> = {};
    Object.entries(NOME_PAIS_MAPA).forEach(([pt, en]) => { inv[en] = pt; });
    return inv;
  }, []);

  if (!geo) return <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">Carregando mapa...</div>;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }}>
          {geo.map((d: any, i: number) => {
            const nomeEn = d.properties.name;
            const nomePt = nomeParaPtbr[nomeEn];
            const leads = nomePt ? porPais[nomePt] : undefined;
            const isBrasil = nomeEn === "Brazil";
            const fill = leads ? (isBrasil ? "hsl(var(--primary))" : "hsl(var(--gold))") : "hsl(var(--muted) / 0.4)";
            return (
              <path
                key={i}
                d={path(d) || ""}
                fill={fill}
                stroke="hsl(var(--border))"
                strokeWidth={0.4 / transform.scale}
                className={leads ? "cursor-pointer transition-opacity hover:opacity-80" : ""}
                onMouseMove={(e) => {
                  if (!leads) return;
                  const rect = svgRef.current?.getBoundingClientRect();
                  onHover({ nome: nomePt, leads, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
                }}
                onMouseLeave={() => onHover(null)}
                onClick={() => { if (isBrasil) onClickBrasil(); }}
              />
            );
          })}
        </g>
      </svg>
      <ZoomHint onReset={reset} />
      <p className="text-[11px] text-muted-foreground mt-2">Clique no Brasil para detalhar por estado. Role o mouse para zoom, arraste para mover.</p>
    </div>
  );
}

// ============================================================
// Mapa do Brasil por estado
// ============================================================
function BrazilMap({ porEstado, onClickEstado, onHover }: { porEstado: Record<string, { leads: number; uf: string }>; onClickEstado: (nome: string) => void; onHover: (i: any) => void }) {
  const [geo, setGeo] = useState<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { transform, onWheel, onMouseDown, onMouseMove, onMouseUp, reset } = useMapZoomPan();

  useEffect(() => {
    fetch("/geo/br-states.json")
      .then(r => r.json())
      .then(fc => setGeo(fc.features))
      .catch(() => setGeo([]));
  }, []);

  const width = 640, height = 500;

  const projection = useMemo(() => {
    if (!geo || geo.length === 0) return null;
    return d3.geoMercator().fitSize([width, height], { type: "FeatureCollection", features: geo } as any);
  }, [geo]);

  const path = projection ? d3.geoPath(projection as any) : null;
  const max = Math.max(1, ...Object.values(porEstado).map(v => v.leads));

  if (!geo || !path) return <div className="h-80 flex items-center justify-center text-sm text-muted-foreground">Carregando estados...</div>;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <g style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }}>
          {geo.map((d: any, i: number) => {
            const nome = d.properties.name;
            const info = porEstado[nome];
            const leads = info?.leads || 0;
            const intensity = leads > 0 ? 0.25 + (leads / max) * 0.75 : 0;
            return (
              <path
                key={i}
                d={path(d) || ""}
                fill={leads > 0 ? `hsl(213 94% 55% / ${intensity})` : "hsl(var(--muted) / 0.4)"}
                stroke="hsl(var(--border))"
                strokeWidth={0.6 / transform.scale}
                className={leads > 0 ? "cursor-pointer transition-opacity hover:opacity-80" : ""}
                onMouseMove={(e) => {
                  if (!leads) return;
                  const rect = svgRef.current?.getBoundingClientRect();
                  onHover({ nome, leads, x: e.clientX - (rect?.left || 0), y: e.clientY - (rect?.top || 0) });
                }}
                onMouseLeave={() => onHover(null)}
                onClick={() => { if (leads > 0) onClickEstado(nome); }}
              />
            );
          })}
        </g>
      </svg>
      <ZoomHint onReset={reset} />
      <p className="text-[11px] text-muted-foreground mt-2">Clique num estado para ver as cidades. Role o mouse para zoom, arraste para mover.</p>
    </div>
  );
}

// ============================================================
// Lista de cidades (drill-down)
// ============================================================
function CidadesList({ cidades }: { cidades: { nome: string; leads: number }[] }) {
  if (cidades.length === 0) {
    return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Nenhum lead com cidade identificada neste estado</div>;
  }
  const max = cidades[0]?.leads || 1;
  return (
    <div className="space-y-3 max-h-[440px] overflow-y-auto pr-2">
      {cidades.map(c => (
        <div key={c.nome}>
          <div className="flex justify-between text-sm mb-1">
            <span className={c.nome === "Cidade não informada" ? "text-muted-foreground italic" : ""}>{c.nome}</span>
            <span className="text-muted-foreground">{c.leads}</span>
          </div>
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
            <div className="h-full bg-gradient-red rounded-full" style={{ width: `${(c.leads / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
