import { useEffect, useRef, useState } from "react";
import * as d3 from "d3-geo";
import { feature } from "topojson-client";
import { GlassCard } from "./GlassCard";
import { Globe2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface GeoValue {
  /** Nome do país (em inglês, como aparece no world-atlas) ou sigla do estado (UF). */
  key: string;
  value: number;
}

interface WorldToBrazilMapProps {
  /** Leads por país (nome em inglês: "Brazil", "Paraguay", "Portugal", "China"...). */
  countryData?: GeoValue[];
  /** Leads por estado (BR), cruzado com DDD do telefone. Sigla: "SP", "MG"... */
  stateData?: GeoValue[];
}

const WORLD_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const BRAZIL_STATES_URL =
  "https://cdn.jsdelivr.net/gh/giuliano-macedo/geodata-br-states@main/geojson/br_states.json";

type Feat = { type: "Feature"; properties: Record<string, any>; geometry: any };

export function WorldToBrazilMap({ countryData, stateData }: WorldToBrazilMapProps) {
  const [showStates, setShowStates] = useState(false);
  const [worldFeatures, setWorldFeatures] = useState<Feat[] | null>(null);
  const [brazilFeatures, setBrazilFeatures] = useState<Feat[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; value: number; x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [realStateData, setRealStateData] = useState<{ key: string; value: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLeadsGeografia() {
      try {
        const { data, error } = await supabase.from('leads_geografia').select('uf').eq('deletado', false);

        if (error) {
          console.error("Erro no Supabase:", error);
          return;
        }

        if (data) {
          const contagemPorUf = data.reduce((acc, lead) => {
            if (lead.uf) {
              const ufUpper = lead.uf.toUpperCase();
              acc[ufUpper] = (acc[ufUpper] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>);

          const dadosMapeados = Object.entries(contagemPorUf).map(([uf, count]) => ({
            key: uf,
            value: count
          }));

          setRealStateData(dadosMapeados);
        }
      } catch (error) {
        console.error("Erro ao buscar dados geográficos:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeadsGeografia();
  }, []);
  
  // Calcula o total de leads reais para mostrar no Brasil inteiro
  const totalLeads = realStateData.reduce((acc, curr) => acc + curr.value, 0);
  
  const countries = countryData && countryData.length > 0 
    ? countryData 
    : [{ key: "Brazil", value: totalLeads }];
    
  const states = realStateData.length > 0 
    ? realStateData 
    : (stateData || []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(WORLD_TOPOJSON_URL).then((r) => r.json()),
      fetch(BRAZIL_STATES_URL).then((r) => r.json()),
    ])
      .then(([worldTopo, brStates]) => {
        if (cancelled) return;
        const countriesGeo = feature(worldTopo, worldTopo.objects.countries) as any;
        setWorldFeatures(countriesGeo.features);
        setBrazilFeatures(brStates.features);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const W = 640;
  const H = 300;

  const countryValueFor = (props: Record<string, any>) => {
    const name = props.name || props.NAME || props.ADMIN;
    return countries.find((c) => c.key === name)?.value ?? 0;
  };
  const stateValueFor = (props: Record<string, any>) => {
    const sigla = props.SIGLA || props.sigla || props.UF || props.abbrev_state;
    return states.find((s) => s.key === sigla)?.value ?? 0;
  };

  const maxCountry = Math.max(...countries.map((c) => c.value), 1);
  const maxState = Math.max(...states.map((s) => s.value), 1);

  const colorFor = (v: number, max: number) => {
    const intensity = v / max;
    if (v === 0) return "#1c1c24";
    if (intensity > 0.6) return "#3B82F6";
    if (intensity > 0.25) return "#2C5C8A";
    return "#26344a";
  };

  return (
    <GlassCard className="relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe2 className="h-4 w-4 text-primary" />
          <h3 className="font-display font-bold text-lg tracking-wide">Origem geográfica dos leads</h3>
        </div>
        {showStates && (
          <button
            onClick={() => setShowStates(false)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Mundo
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        {showStates
          ? "Distribuição por estado, cruzada com o DDD do telefone"
          : "Clique no Brasil para ver a distribuição por estado"}
      </p>

      <div className="relative h-72 rounded-xl overflow-hidden bg-background/40 border border-border/50">
        {!worldFeatures && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Carregando mapa...
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground px-6 text-center">
            Não foi possível carregar o mapa geográfico agora.
          </div>
        )}
        {worldFeatures && brazilFeatures && (
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full">
            {!showStates &&
              (() => {
                const projection = d3.geoNaturalEarth1().fitSize(
                  [W, H],
                  { type: "FeatureCollection", features: worldFeatures } as any
                );
                const path = d3.geoPath(projection);
                return worldFeatures.map((f, i) => {
                  const v = countryValueFor(f.properties);
                  return (
                    <path
                      key={i}
                      d={path(f as any) || undefined}
                      fill={colorFor(v, maxCountry)}
                      stroke="#0D0D1A"
                      strokeWidth={0.5}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onMouseMove={(e) => {
                        if (v > 0) {
                          const rect = svgRef.current?.getBoundingClientRect();
                          setTooltip({
                            label: f.properties.name || f.properties.NAME,
                            value: v,
                            x: rect ? e.clientX - rect.left : 0,
                            y: rect ? e.clientY - rect.top : 0,
                          });
                        }
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => {
                        const name = f.properties.name || f.properties.NAME;
                        if (name === "Brazil") setShowStates(true);
                      }}
                    />
                  );
                });
              })()}
            {showStates &&
              (() => {
                const projection = d3
                  .geoMercator()
                  .fitSize([W, H], { type: "FeatureCollection", features: brazilFeatures } as any);
                const path = d3.geoPath(projection);
                return brazilFeatures.map((f, i) => {
                  const v = stateValueFor(f.properties);
                  return (
                    <path
                      key={i}
                      d={path(f as any) || undefined}
                      fill={colorFor(v, maxState)}
                      stroke="#0D0D1A"
                      strokeWidth={0.5}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                      onMouseMove={(e) => {
                        const rect = svgRef.current?.getBoundingClientRect();
                        const sigla = f.properties.SIGLA || f.properties.sigla || f.properties.UF || "?";
                        setTooltip({
                          label: sigla,
                          value: v,
                          x: rect ? e.clientX - rect.left : 0,
                          y: rect ? e.clientY - rect.top : 0,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                });
              })()}
          </svg>
        )}

        {tooltip && (
          <div
            className="absolute pointer-events-none bg-card border border-border rounded-md px-2.5 py-1.5 text-xs shadow-lg z-10"
            style={{ left: tooltip.x, top: tooltip.y, transform: "translate(12px, -12px)" }}
          >
            <span className="font-semibold text-foreground">{tooltip.label}</span>
            <span className="text-muted-foreground"> — {tooltip.value} leads</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <span className="text-[10px] text-muted-foreground">menos leads</span>
        <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-muted to-primary" />
        <span className="text-[10px] text-muted-foreground">mais leads</span>
      </div>
    </GlassCard>
  );
}
