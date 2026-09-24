import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadGeografiaRow {
  id: string;
  pipeline_id: string | null;
  pais: string | null;
  uf: string | null;
  estado: string | null;
  cidade: string | null;
  rating: number | null;
  created_at: string;
}

const PAGE_SIZE = 1000;

export function useLeadsGeografia() {
  return useQuery({
    queryKey: ["leads_geografia_all"],
    queryFn: async (): Promise<LeadGeografiaRow[]> => {
      let all: LeadGeografiaRow[] = [];
      let from = 0;
      // Paginação necessária: PostgREST trunca em 1000 linhas por padrão
      while (true) {
        // Esquema real da tabela (confirmado via information_schema.columns):
        // id, rating, pipeline_id, deletado, pais, estado, cidade, created_at.
        // Não existem colunas deal_id/uf/regiao/estado_organizacao — selecioná-las
        // fazia o PostgREST rejeitar a query inteira (erro), deixando o mapa vazio.
        const { data, error } = await supabase
          .from("leads_geografia")
          .select("id, pipeline_id, pais, estado, cidade, rating, created_at")
          .eq("deletado", false)
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data as unknown as LeadGeografiaRow[]);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // atualiza sozinho a cada 1 minuto
    refetchIntervalInBackground: false, // só continua puxando se a aba estiver aberta/em foco
  });
}
