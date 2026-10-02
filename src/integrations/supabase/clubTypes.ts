export type MemberStatus = 'ativo' | 'inadimplente' | 'vencendo' | 'cancelado'
export type MemberLevel = 'BRONZE' | 'PRATA' | 'OURO'
export type PaymentMethod = 'PIX' | 'boleto' | 'cartão'
export type PaymentStatus = 'pendente' | 'pago' | 'atrasado' | 'cancelado'

export interface Plan {
  id: string
  name: string
  annual_value: number
  description: string | null
  active: boolean
  created_at: string
}

export interface PlanBenefit {
  id: string
  plan_id: string
  description: string
  sort_order: number
}

export interface Member {
  id: string
  company_name: string
  trade_name: string | null
  cnpj: string | null
  segment: string | null
  state: string | null
  city: string | null
  instagram: string | null
  website: string | null
  email: string | null
  level: MemberLevel
  status: MemberStatus
  plan_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MemberContact {
  id: string
  member_id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
  birthday: string | null
  is_primary: boolean
}

export interface Contract {
  id: string
  member_id: string
  plan_id: string | null
  start_date: string
  end_date: string
  annual_value: number
  installments: number
  down_payment: number | null
  notes: string | null
  created_at: string
}

export interface Payment {
  id: string
  contract_id: string
  member_id: string
  installment_number: number
  amount: number
  due_date: string
  paid_date: string | null
  status: PaymentStatus
  payment_method: PaymentMethod | null
  notes: string | null
}

export interface Alert {
  id: string
  member_id: string
  type: string
  message: string
  severity: 'info' | 'warn' | 'danger'
  resolved: boolean
  created_at: string
}

export interface MemberOverview {
  id: string
  company_name: string
  trade_name: string | null
  state: string | null
  segment: string | null
  level: MemberLevel
  status: MemberStatus
  plan_name: string | null
  annual_value: number | null
  start_date: string | null
  end_date: string | null
  installments_paid: number
  installments_total: number
  overdue_amount: number
  next_payment_date: string | null
}
