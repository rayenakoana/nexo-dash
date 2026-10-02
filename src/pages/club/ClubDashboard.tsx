import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Clock, CheckCircle2, TrendingUp } from 'lucide-react'
import { ClubShell } from '@/components/club/ClubShell'
import { ClubKPICard } from '@/components/club/ClubKPICard'
import { TagBadge } from '@/components/club/ClubBadge'
import { useClubMembersOverview, useClubBIReceita } from '@/hooks/useClubData'
import { format, parseISO } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { MemberLevel, MemberStatus } from '@/integrations/supabase/clubTypes'

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function ClubDashboard() {
  const navigate = useNavigate()
  const { data: members = [], isLoading } = useClubMembersOverview()
  const { data: biReceita = [] } = useClubBIReceita()

  const ativos = members.filter(m => m.status === 'ativo').length
  const inadimplentes = members.filter(m => m.status === 'inadimplente')
  const vencendo = members.filter(m => m.status === 'vencendo')
  const total = members.length

  const overdueAmount = inadimplentes.reduce((acc, m) => acc + (m.overdue_amount ?? 0), 0)
  const monthlyRevenue = members
    .filter(m => m.status === 'ativo' && m.annual_value)
    .reduce((acc, m) => acc + (m.annual_value ?? 0) / 12, 0)

  const levelCounts: Record<MemberLevel, number> = { BRONZE: 0, PRATA: 0, OURO: 0 }
  members.forEach(m => { if (m.level) levelCounts[m.level]++ })

  const stateCounts: Record<string, number> = {}
  members.forEach(m => { if (m.state) stateCounts[m.state] = (stateCounts[m.state] ?? 0) + 1 })
  const topStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxState = topStates[0]?.[1] ?? 1

  const chartData = biReceita.length > 0
    ? biReceita.map((r: { month: string; total_revenue: number }) => ({
        name: MONTHS_PT[new Date(r.month).getMonth()],
        value: Math.round((r.total_revenue ?? 0) / 1000),
      }))
    : MONTHS_PT.slice(0, new Date().getMonth() + 1).map(m => ({ name: m, value: 0 }))

  const fmtBRL = (v: number) =>
    v >= 1_000_000
      ? `R$ ${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
      : `R$ ${Math.round(v / 1000)}k`

  return (
    <ClubShell>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-['Barlow_Condensed'] text-2xl font-extrabold tracking-widest uppercase text-foreground">
            CS Club ERP
          </h1>
          <p className="text-[10px] tracking-[0.14em] uppercase text-muted-foreground mt-0.5">
            Dashboard · {format(new Date(), 'MMMM yyyy').replace(/^\w/, c => c.toUpperCase())}
          </p>
        </div>

        {/* Alerts */}
        <section>
          <SectionLabel>Alertas do Sistema</SectionLabel>
          <div className="space-y-2">
            {inadimplentes.length > 0 && (
              <AlertRow
                type="danger"
                icon={<AlertTriangle className="w-4 h-4" />}
                text={`${inadimplentes.length} ${inadimplentes.length === 1 ? 'membro inadimplente' : 'membros inadimplentes'} — parcelas em atraso`}
                value={fmtBRL(overdueAmount)}
                onClick={() => navigate('/club/financeiro')}
              />
            )}
            {vencendo.length > 0 && (
              <AlertRow
                type="warn"
                icon={<Clock className="w-4 h-4" />}
                text={`${vencendo.length} ${vencendo.length === 1 ? 'contrato vence' : 'contratos vencem'} em menos de 60 dias`}
                value={`${vencendo.length} membros`}
                onClick={() => navigate('/club/membros?filter=vencendo')}
              />
            )}
            <AlertRow
              type="ok"
              icon={<CheckCircle2 className="w-4 h-4" />}
              text={`${ativos} membros com status ativo e contratos em dia`}
              value={`${total > 0 ? Math.round((ativos / total) * 100) : 0}%`}
            />
          </div>
        </section>

        {/* KPIs */}
        <section>
          <SectionLabel>Visão Geral</SectionLabel>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-[0.85rem] p-4 h-24 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ClubKPICard
                label="Membros Ativos"
                value={ativos}
                meta={<TagBadge color="green">+{members.filter(m => m.status !== 'cancelado').length - ativos} pendentes</TagBadge>}
                color="green"
                progress={(ativos / Math.max(total, 1)) * 100}
              />
              <ClubKPICard
                label="Receita Mensal"
                value={fmtBRL(monthlyRevenue)}
                meta={<TagBadge color="blue">Estimado</TagBadge>}
                progress={73}
              />
              <ClubKPICard
                label="Inadimplentes"
                value={inadimplentes.length}
                meta={<TagBadge color="amber">{fmtBRL(overdueAmount)} em aberto</TagBadge>}
                color="amber"
              />
              <ClubKPICard
                label="Renovação <60d"
                value={vencendo.length}
                meta={<TagBadge color="red">Atenção necessária</TagBadge>}
                color="red"
              />
              <ClubKPICard label="Total Membros" value={total} meta={`+ ${members.filter(m => m.status === 'cancelado').length} cancelados`} />
              <ClubKPICard
                label="Ticket Médio"
                value={total > 0 ? `R$ ${Math.round(members.reduce((a, m) => a + (m.annual_value ?? 0), 0) / Math.max(members.filter(m => m.annual_value).length, 1)).toLocaleString('pt-BR')}` : 'R$ —'}
                meta={<TagBadge color="blue">Anual</TagBadge>}
              />
              <ClubKPICard label="Nível OURO" value={levelCounts.OURO} meta={<TagBadge color="amber">Premium</TagBadge>} color="amber" />
              <ClubKPICard
                label="Taxa de Retenção"
                value={`${total > 0 ? Math.round((ativos / total) * 100) : 0}%`}
                meta={<TagBadge color="green">Meta 85%</TagBadge>}
                color="green"
              />
            </div>
          )}
        </section>

        {/* Chart */}
        <section className="bg-card/75 backdrop-blur border border-border rounded-[0.85rem] p-4">
          <div className="flex items-center gap-3 mb-4">
            <SectionLabel style={{ margin: 0, flex: 1 }}>Receita Mensal 2026</SectionLabel>
            <span className="text-[10px] text-muted-foreground">R$ em mil</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240,15%,14%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(0,0%,52%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(0,0%,52%)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'hsl(240,20%,11%)', border: '1px solid hsl(240,15%,14%)', borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [`R$ ${v}k`, 'Receita']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(355,82%,51%)" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Two col */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Levels */}
          <div className="bg-card/75 backdrop-blur border border-border rounded-[0.85rem] p-4">
            <SectionLabel>Distribuição por Nível</SectionLabel>
            <div className="space-y-3 mt-3">
              {(['OURO', 'PRATA', 'BRONZE'] as MemberLevel[]).map(lv => {
                const n = levelCounts[lv]
                const pct = total > 0 ? Math.round((n / total) * 100) : 0
                const color = lv === 'OURO' ? 'hsl(44,90%,55%)' : lv === 'PRATA' ? 'hsl(220,10%,65%)' : 'hsl(25,60%,55%)'
                return (
                  <div key={lv}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-medium">{lv}</span>
                      <span className="font-['Barlow_Condensed'] text-sm font-bold">{n} ({pct}%)</span>
                    </div>
                    <div className="h-[5px] rounded-full bg-border overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* States */}
          <div className="bg-card/75 backdrop-blur border border-border rounded-[0.85rem] p-4">
            <SectionLabel>Membros por Estado</SectionLabel>
            <div className="space-y-3 mt-3">
              {topStates.map(([state, count]) => (
                <div key={state}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium">{state}</span>
                    <span className="font-['Barlow_Condensed'] text-sm font-bold">{count}</span>
                  </div>
                  <div className="h-[5px] rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(count / maxState) * 100}%`, background: 'hsl(355,82%,51%)' }}
                    />
                  </div>
                </div>
              ))}
              {topStates.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum dado disponível</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClubShell>
  )
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground" style={style}>
      {children}
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function AlertRow({
  type, icon, text, value, onClick,
}: {
  type: 'danger' | 'warn' | 'ok'
  icon: React.ReactNode
  text: string
  value: string
  onClick?: () => void
}) {
  const styles = {
    danger: 'bg-[hsl(355,82%,51%)]/7 border-[hsl(355,82%,51%)]/25 text-[hsl(355,82%,80%)]',
    warn: 'bg-[#F59E0B]/7 border-[#F59E0B]/25 text-[hsl(38,95%,80%)]',
    ok: 'bg-[#34D399]/7 border-[#34D399]/25 text-[hsl(150,60%,75%)]',
  }
  return (
    <div
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[9px] border text-[12px] transition-opacity ${styles[type]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
      onClick={onClick}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 font-medium">{text}</span>
      <span className="font-['Barlow_Condensed'] text-base font-bold shrink-0">{value}</span>
    </div>
  )
}
