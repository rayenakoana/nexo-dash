import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { ClubShell } from '@/components/club/ClubShell'
import { StatusPill, LevelBadge } from '@/components/club/ClubBadge'
import { useClubMembersOverview } from '@/hooks/useClubData'
import type { MemberStatus } from '@/integrations/supabase/clubTypes'
import { format } from 'date-fns'

const FILTERS: { key: MemberStatus | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'ativo', label: 'Ativos' },
  { key: 'inadimplente', label: 'Inadimplentes' },
  { key: 'vencendo', label: 'Renovação <60d' },
  { key: 'cancelado', label: 'Cancelados' },
]

export default function ClubMembros() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialFilter = (searchParams.get('filter') as MemberStatus | 'todos') ?? 'todos'
  const [filter, setFilter] = useState<MemberStatus | 'todos'>(initialFilter)
  const [search, setSearch] = useState('')

  const { data: members = [], isLoading } = useClubMembersOverview()

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: members.length }
    members.forEach(m => { c[m.status] = (c[m.status] ?? 0) + 1 })
    return c
  }, [members])

  const filtered = useMemo(() =>
    members.filter(m => {
      const matchFilter = filter === 'todos' || m.status === filter
      const q = search.toLowerCase()
      const matchSearch = !q || m.company_name.toLowerCase().includes(q) || (m.state ?? '').toLowerCase().includes(q)
      return matchFilter && matchSearch
    }),
    [members, filter, search]
  )

  return (
    <ClubShell>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="font-['Barlow_Condensed'] text-2xl font-extrabold tracking-widest uppercase">Membros</h1>
            <p className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground mt-0.5">
              {members.length} total · {counts.ativo ?? 0} ativos
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                className="pl-8 pr-3 py-1.5 rounded-lg border border-border bg-card text-sm w-48 outline-none focus:border-[hsl(355,82%,51%)] transition-colors placeholder:text-muted-foreground"
                placeholder="Buscar empresa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white border-0 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, hsl(355,82%,51%), hsl(355,72%,31%))' }}
              onClick={() => navigate('/club/membros/novo')}
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Membro
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                filter === f.key
                  ? 'bg-[hsl(355,82%,51%)]/18 border-[hsl(355,82%,51%)] text-[hsl(355,82%,51%)]'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label} ({counts[f.key] ?? 0})
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-[0.85rem] border border-border">
          <table className="w-full text-[12px] min-w-[600px] border-collapse">
            <thead>
              <tr>
                {['Empresa', 'Plano / Nível', 'Status', 'Contrato', 'Próximo Pgto', 'Estado'].map(h => (
                  <th key={h} className="text-[9px] font-bold tracking-[0.1em] uppercase text-muted-foreground px-3 py-2.5 text-left border-b border-border bg-card whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(6).fill(0).map((_, i) => (
                    <tr key={i}>
                      {Array(6).fill(0).map((__, j) => (
                        <td key={j} className="px-3 py-3 border-b border-border">
                          <div className="h-4 bg-muted/20 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.map((m, i) => (
                    <tr
                      key={m.id}
                      className="cursor-pointer transition-colors hover:bg-card/60"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid hsl(240,15%,14%)' : 'none' }}
                      onClick={() => navigate(`/club/membros/${m.id}`)}
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-[12.5px]">{m.company_name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{m.segment} · {m.state}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[11px] font-semibold mb-1">{m.plan_name ?? '—'}</div>
                        <LevelBadge level={m.level} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill status={m.status} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-['Barlow_Condensed'] text-[14px] font-bold">
                          {m.start_date ? format(new Date(m.start_date), 'dd/MM/yyyy') : '—'}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          → {m.end_date ? format(new Date(m.end_date), 'dd/MM/yyyy') : '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-['Barlow_Condensed'] text-[14px] font-bold">
                          {m.next_payment_date ? format(new Date(m.next_payment_date), 'dd/MM/yyyy') : '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[11px] font-semibold px-1.5 py-[2px] bg-card rounded border border-border">
                          {m.state ?? '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                    Nenhum membro encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ClubShell>
  )
}
