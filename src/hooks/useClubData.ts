import { useQuery } from '@tanstack/react-query'
import { clubSupabase } from '@/integrations/supabase/clubClient'
import type { MemberOverview, Payment, Alert } from '@/integrations/supabase/clubTypes'

export function useClubMembersOverview() {
  return useQuery<MemberOverview[]>({
    queryKey: ['club', 'members-overview'],
    queryFn: async () => {
      const { data, error } = await clubSupabase
        .from('v_members_overview')
        .select('*')
        .order('company_name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useClubAlerts() {
  return useQuery<Alert[]>({
    queryKey: ['club', 'alerts'],
    queryFn: async () => {
      const { data, error } = await clubSupabase
        .from('alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useClubOverduePayments() {
  return useQuery<Payment[]>({
    queryKey: ['club', 'overdue-payments'],
    queryFn: async () => {
      const { data, error } = await clubSupabase
        .from('payments')
        .select('*')
        .eq('status', 'atrasado')
        .order('due_date')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useMemberPayments(memberId: string) {
  return useQuery<Payment[]>({
    queryKey: ['club', 'payments', memberId],
    enabled: !!memberId,
    queryFn: async () => {
      const { data, error } = await clubSupabase
        .from('payments')
        .select('*')
        .eq('member_id', memberId)
        .order('installment_number')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useClubBIReceita() {
  return useQuery({
    queryKey: ['club', 'bi-receita'],
    queryFn: async () => {
      const { data, error } = await clubSupabase
        .from('v_bi_receita')
        .select('*')
        .order('month', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}
