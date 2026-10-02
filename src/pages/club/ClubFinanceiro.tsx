import { ClubShell } from '@/components/club/ClubShell'
import { ClubKPICard } from '@/components/club/ClubKPICard'
import { TagBadge, StatusPill, LevelBadge } from '@/components/club/ClubBadge'
import { useClubMembersOverview, useClubBIReceita } from '@/hooks/useClubData'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function ClubFinanceiro() {
  const { data: members = [], isLoading } = useClubMembersOverview()
  const { data: biReceita = [] } = useClubBIReceita()

  const inadimplentes = members.filter(m => m.status === 'inadimplente')
  const overdueAmount = inadimplentes.reduce((acc, m) => acc + (m.overdue_amount ?? 0), 0)
  const monthlyRevenue = members
    .filter(m => m.status === 'ativo' && m.annual_value)
    .reduce((acc, m) => acc + (m.annual_value ?? 0) / 12, 0)
  const annualRevenue = monthlyRevenue * 10 // Jan–Out

  const pendingPayments = members.filter(m => m.installments_total > m.installments_paid)
  const pendingAmount = pendingPayments.reduce((acc, m) => {
    const installmentValue = (m.annual_value ?? 0) / Math.max(m.installments_total, 1)
    return acc + installmentValue * (m.installments_total - m.installments_paid)
  }, 0)

  const fmtBRL = (v: number) =>
    v >= 1_000_000
      ? `R$ ${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
      : `R$ ${Math.round(v / 1000)}k`

  const chartData = biReceita.length > 0
    ? biReceita.map((r: { month: string; total_revenue: number }) => ({
        name: MONTHS_PT[new Date(r.month).getMonth()],
        value: Math.round((r.total_revenue ?? 0) / 1000),
      }))
    : MONTHS_PT.slice(0, new Date().getMonth() + 1).map(m => ({ name: m, value: 0 }))

  return (
    <ClubShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-['Barlow_Condensed'] text-2xl font-extrabold tracking-widest uppercase">Financeiro</h1>
          <p className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground mt-0.5">Parcelas, Inadimplência e Receita</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ClubKPICard
            label="Receita Mensal"
            value={fmtBRL(monthlyRevenue)}
            meta={<TagBadge color="green">Estimado</TagBadge>}
            color="green"
          />
          <ClubKPICard
            label="A Receber (abertas)"
            value={fmtBRL(pendingAmount)}
            meta={`${pendingPayments.length} parcelas pendentes`}
          />
          <ClubKPICard
            label="Inadimplente"
            value={fmtBRL(overdueAmount)}
            meta={<TagBadge color="amber">{inadimplentes.length} membros</TagBadge>}
            color="amber"
          />
          <ClubKPICard
            label="Receita Anual 2026"
            value={fmtBRL(annualRevenue)}
            meta={<TagBadge color="blue">Jan–Out</TagBadge>}
          />
        </div>

        {/* Inadimplentes table */}
        <div className="bg-card/75 border border-border rounded-[0.85rem] p-4">
          <SectionLabel>Inadimplentes — Parcelas em Atraso</SectionLabel>
          <div className="overflow-x-auto rounded-lg border border-border mt-3">
            <table className="w-full text-[12px] min-w-[500px] border-collapse">
              <thead>
                <tr>
                  {['Membro', 'Nível', 'Parcelas', 'Valor Total', 'Estado'].map(h => (
                    <th key={h} className="text-[9px] font-bold tracking-[0.1em] uppercase text-muted-foreground px-3 py-2.5 text-left border-b border-border bg-card whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array(3).fill(0).map((_, i) => (
                      <tr key={i}>
                        {Array(5).fill(0).map((__, j) => (
                          <td key={j} className="px-3 py-3 border-b border-border">
                            <div className="h-4 bg-muted/20 rounded animate-pulse" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : inadimplentes.map((m, i) => {
                      const overdue = m.installments_total - m.installments_paid
                      const installmentValue = (m.annual_value ?? 0) / Math.max(m.installments_total, 1)
                      const overdueVal = installmentValue * overdue
                      return (
                        <tr key={m.id} style={{ borderBottom: i < inadimplentes.length - 1 ? '1px solid hsl(240,15%,14%)' : 'none' }}>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-[12.5px]">{m.company_name}</div>
                            <div className="text-[10px] text-muted-foreground">{m.segment}</div>
                          </td>
                          <td className="px-3 py-2.5"><LevelBadge level={m.level} /></td>
                          <td className="px-3 py-2.5">
                            <TagBadge color="amber">{overdue} em atraso</TagBadge>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-['Barlow_Condensed'] text-[14px] font-bold text-[#F59E0B]">
                              {overdueVal > 0
                                ? `R$ ${overdueVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : `R$ ${(m.overdue_amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-[11px] font-semibold px-1.5 py-[2px] bg-card rounded border border-border">
                              {m.state ?? '—'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                {!isLoading && inadimplentes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum membro inadimplente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card/75 border border-border rounded-[0.85rem] p-4">
          <SectionLabel>Receita por Mês — 2026</SectionLabel>
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
        </div>
      </div>
    </ClubShell>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
      {children}
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}
