import { useState, useEffect } from 'react'
import { ClubShell } from '@/components/club/ClubShell'
import { TagBadge } from '@/components/club/ClubBadge'
import { clubSupabase } from '@/integrations/supabase/clubClient'
import type { Plan, PlanBenefit } from '@/integrations/supabase/clubTypes'

export default function ClubPlanos() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [benefits, setBenefits] = useState<PlanBenefit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      clubSupabase.from('plans').select('*').order('annual_value'),
      clubSupabase.from('plan_benefits').select('*').order('sort_order'),
    ]).then(([p, b]) => {
      if (p.data) setPlans(p.data)
      if (b.data) setBenefits(b.data)
      setLoading(false)
    })
  }, [])

  const fmtBRL = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <ClubShell>
      <div className="space-y-6">
        <div>
          <h1 className="font-['Barlow_Condensed'] text-2xl font-extrabold tracking-widest uppercase">Planos</h1>
          <p className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground mt-0.5">
            Configuração de planos e benefícios
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map(i => (
              <div key={i} className="h-48 bg-card rounded-[0.85rem] border border-border animate-pulse" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="font-['Barlow_Condensed'] text-2xl font-bold uppercase tracking-widest mb-2">Planos e Benefícios</div>
            <p className="text-sm max-w-xs mx-auto leading-relaxed">
              Configure os planos Essencial, Premium e benefícios por nível (Bronze, Prata, Ouro)
            </p>
            <div className="mt-4"><TagBadge color="amber">Aguardando planilha</TagBadge></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => {
              const planBenefits = benefits.filter(b => b.plan_id === plan.id)
              return (
                <div key={plan.id} className="bg-card border border-border rounded-[0.85rem] p-5 flex flex-col gap-4">
                  <div>
                    <div className="font-['Barlow_Condensed'] text-xl font-extrabold tracking-wide uppercase">
                      {plan.name}
                    </div>
                    {plan.description && (
                      <p className="text-[11px] text-muted-foreground mt-1">{plan.description}</p>
                    )}
                  </div>
                  <div>
                    <div className="font-['Barlow_Condensed'] text-[28px] font-extrabold leading-none" style={{ color: 'hsl(355,82%,51%)' }}>
                      {fmtBRL(plan.annual_value)}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">/ ano</div>
                  </div>
                  {planBenefits.length > 0 && (
                    <div>
                      <div className="text-[9px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-2">Benefícios</div>
                      <ul className="space-y-1.5">
                        {planBenefits.map(b => (
                          <li key={b.id} className="flex items-start gap-2 text-[12px]">
                            <span style={{ color: 'hsl(355,82%,51%)' }} className="shrink-0 mt-0.5">✓</span>
                            {b.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!plan.active && (
                    <div className="mt-auto">
                      <TagBadge color="default">Inativo</TagBadge>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ClubShell>
  )
}
