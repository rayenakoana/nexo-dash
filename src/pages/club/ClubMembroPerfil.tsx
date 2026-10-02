import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Plus } from 'lucide-react'
import { ClubShell } from '@/components/club/ClubShell'
import { StatusPill, LevelBadge, TagBadge } from '@/components/club/ClubBadge'
import { ClubKPICard } from '@/components/club/ClubKPICard'
import { useMemberPayments } from '@/hooks/useClubData'
import { clubSupabase } from '@/integrations/supabase/clubClient'
import type { Member, MemberContact, Contract, Payment } from '@/integrations/supabase/clubTypes'
import { format } from 'date-fns'

type Tab = 'dados' | 'financeiro' | 'reunioes' | 'eventos'

export default function ClubMembroPerfil() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('dados')
  const [member, setMember] = useState<Member | null>(null)
  const [contacts, setContacts] = useState<MemberContact[]>([])
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)

  const { data: payments = [] } = useMemberPayments(id ?? '')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      clubSupabase.from('members').select('*').eq('id', id).single(),
      clubSupabase.from('member_contacts').select('*').eq('member_id', id).order('is_primary', { ascending: false }),
      clubSupabase.from('contracts').select('*').eq('member_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]).then(([m, c, ct]) => {
      if (m.data) setMember(m.data)
      if (c.data) setContacts(c.data)
      if (ct.data) setContract(ct.data)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <ClubShell>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-card rounded-[0.85rem] border border-border" />
          <div className="h-40 bg-card rounded-[0.85rem] border border-border" />
        </div>
      </ClubShell>
    )
  }

  if (!member) {
    return (
      <ClubShell>
        <div className="text-center py-20 text-muted-foreground">Membro não encontrado</div>
      </ClubShell>
    )
  }

  const initials = member.company_name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('')
  const paid = payments.filter(p => p.status === 'pago').length
  const total = payments.length
  const totalPaid = payments.filter(p => p.status === 'pago').reduce((a, p) => a + p.amount, 0)
  const totalPending = payments.filter(p => p.status !== 'pago').reduce((a, p) => a + p.amount, 0)

  const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtDate = (d: string | null) => d ? format(new Date(d), 'dd/MM/yyyy') : '—'

  const payStatusStyle: Record<string, string> = {
    pago: 'text-[#34D399]',
    pendente: 'text-muted-foreground',
    atrasado: 'text-[#F59E0B]',
    cancelado: 'text-muted-foreground line-through',
  }

  return (
    <ClubShell>
      <div className="space-y-4">
        {/* Back + actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => navigate('/club/membros')}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-['Barlow_Condensed'] text-2xl font-extrabold tracking-wide uppercase truncate">
              {member.company_name}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{member.segment} · {member.state}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-[11px] font-semibold text-foreground hover:border-[hsl(355,82%,51%)] transition-colors">
              <Edit2 className="w-3 h-3" /> Editar
            </button>
            <button
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white border-0"
              style={{ background: 'linear-gradient(135deg, hsl(355,82%,51%), hsl(355,72%,31%))' }}
            >
              <Plus className="w-3 h-3" /> Nova Parcela
            </button>
          </div>
        </div>

        {/* Member header card */}
        <div className="bg-card border border-border rounded-[0.85rem] p-4 flex items-start gap-4">
          <div
            className="w-13 h-13 rounded-xl flex items-center justify-center font-['Barlow_Condensed'] text-xl font-extrabold text-white shrink-0 tracking-wide"
            style={{ background: 'linear-gradient(135deg, hsl(355,82%,51%), hsl(355,72%,31%))', width: 52, height: 52 }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-['Barlow_Condensed'] text-[22px] font-extrabold tracking-wide leading-tight">
              {member.company_name}
            </div>
            <div className="flex items-center gap-2.5 flex-wrap mt-1.5">
              <StatusPill status={member.status} />
              <LevelBadge level={member.level} />
              {contract && (
                <span className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-card/60">
                  Plano — contrato ativo
                </span>
              )}
              {member.state && <span className="text-muted-foreground text-[11px]">{member.state}</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-border">
          {(['dados', 'financeiro', 'reunioes', 'eventos'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-[11.5px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t
                  ? 'text-[hsl(355,82%,51%)] border-[hsl(355,82%,51%)]'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab: Dados */}
        {tab === 'dados' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card/75 border border-border rounded-[0.85rem] p-4">
                <SectionLabel>Dados da Empresa</SectionLabel>
                <FieldList fields={[
                  { label: 'Razão Social', value: member.company_name },
                  { label: 'Nome Fantasia', value: member.trade_name },
                  { label: 'CNPJ', value: member.cnpj },
                  { label: 'Segmento', value: member.segment },
                  { label: 'Estado', value: member.state },
                  { label: 'Cidade', value: member.city },
                  { label: 'E-mail', value: member.email },
                  { label: 'Instagram', value: member.instagram },
                  { label: 'Site', value: member.website },
                ]} />
              </div>
              <div className="bg-card/75 border border-border rounded-[0.85rem] p-4">
                <SectionLabel>Contrato Ativo</SectionLabel>
                {contract ? (
                  <FieldList fields={[
                    { label: 'Início', value: fmtDate(contract.start_date) },
                    { label: 'Término', value: fmtDate(contract.end_date) },
                    { label: 'Valor Anual', value: fmtBRL(contract.annual_value) },
                    { label: 'Parcelas', value: `${contract.installments}x` },
                    { label: 'Entrada', value: contract.down_payment ? fmtBRL(contract.down_payment) : '—' },
                  ]} />
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum contrato ativo</p>
                )}
              </div>
            </div>
            <div className="bg-card/75 border border-border rounded-[0.85rem] p-4">
              <SectionLabel>Representantes</SectionLabel>
              <div className="space-y-2">
                {contacts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum contato cadastrado</p>}
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-card border border-border">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, hsl(355,82%,51%), hsl(355,72%,31%))' }}
                    >
                      {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground">{c.role} {c.phone ? `· ${c.phone}` : ''}</div>
                    </div>
                    {c.is_primary && <TagBadge color="blue">Principal</TagBadge>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Financeiro */}
        {tab === 'financeiro' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <ClubKPICard label="Valor do Club" value={contract ? fmtBRL(contract.annual_value) : '—'} />
              <ClubKPICard label="Parcelas Pagas" value={`${paid}/${total}`} color="green" />
              <ClubKPICard label="Total Pago" value={fmtBRL(totalPaid)} color="green" />
              <ClubKPICard label="A Receber" value={fmtBRL(totalPending)} color="amber" />
            </div>
            <div className="bg-card/75 border border-border rounded-[0.85rem] p-4">
              <SectionLabel>Parcelas</SectionLabel>
              <div className="space-y-0">
                {payments.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma parcela registrada</p>}
                {payments.map((p, i) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 py-2 text-[12px]"
                    style={{ borderBottom: i < payments.length - 1 ? '1px solid hsl(240,15%,14%)' : 'none' }}
                  >
                    <span className="w-6 text-center font-['Barlow_Condensed'] font-bold text-muted-foreground text-[13px]">
                      {p.installment_number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">
                        {p.installment_number === 0 ? 'Entrada' : `Parcela ${p.installment_number}`}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Venc: {fmtDate(p.due_date)}
                        {p.paid_date ? ` · Pago: ${fmtDate(p.paid_date)}` : ''}
                        {p.payment_method ? ` · ${p.payment_method}` : ''}
                      </div>
                    </div>
                    <span className={`font-['Barlow_Condensed'] text-[15px] font-bold whitespace-nowrap ${payStatusStyle[p.status]}`}>
                      {fmtBRL(p.amount)}
                    </span>
                    <PayStatusBadge status={p.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Reuniões */}
        {tab === 'reunioes' && (
          <div className="bg-card/75 border border-border rounded-[0.85rem] p-4">
            <SectionLabel>Reuniões do Club Online</SectionLabel>
            <p className="text-sm text-muted-foreground py-8 text-center">
              Histórico de reuniões disponível na Fase 3
            </p>
          </div>
        )}

        {/* Tab: Eventos */}
        {tab === 'eventos' && (
          <div className="bg-card/75 border border-border rounded-[0.85rem] p-4">
            <SectionLabel>Participação em Eventos e Imersões</SectionLabel>
            <p className="text-sm text-muted-foreground py-8 text-center">
              Controle de presença em eventos disponível na Fase 3
            </p>
          </div>
        )}
      </div>
    </ClubShell>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 text-[9px] font-bold tracking-[0.14em] uppercase text-muted-foreground">
      {children}
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function FieldList({ fields }: { fields: { label: string; value: string | null | undefined }[] }) {
  return (
    <div>
      {fields.filter(f => f.value).map(f => (
        <div key={f.label} className="flex gap-3 py-2 border-b border-border last:border-b-0 text-[12px] items-baseline">
          <span className="w-36 shrink-0 text-muted-foreground font-medium text-[11px]">{f.label}</span>
          <span className="flex-1 min-w-0 font-medium truncate">{f.value}</span>
        </div>
      ))}
    </div>
  )
}

function PayStatusBadge({ status }: { status: string }) {
  const s: Record<string, string> = {
    pago: 'bg-[#34D399]/15 text-[#34D399]',
    pendente: 'bg-muted/15 text-muted-foreground',
    atrasado: 'bg-[#F59E0B]/15 text-[#F59E0B]',
    cancelado: 'bg-muted/10 text-muted-foreground',
  }
  return (
    <span className={`inline-flex px-2 py-[2px] rounded-full text-[9.5px] font-bold capitalize ${s[status] ?? s.pendente}`}>
      {status}
    </span>
  )
}
