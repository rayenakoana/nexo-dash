import { cn } from '@/lib/utils'
import type { MemberStatus, MemberLevel } from '@/integrations/supabase/clubTypes'

export function StatusPill({ status }: { status: MemberStatus }) {
  const styles: Record<MemberStatus, string> = {
    ativo: 'bg-[#34D399]/15 text-[#34D399] before:bg-[#34D399]',
    inadimplente: 'bg-[#F59E0B]/15 text-[#F59E0B] before:bg-[#F59E0B]',
    vencendo: 'bg-[hsl(355,82%,51%)]/15 text-[hsl(355,82%,51%)] before:bg-[hsl(355,82%,51%)]',
    cancelado: 'bg-muted/15 text-muted-foreground before:bg-muted-foreground',
  }
  const labels: Record<MemberStatus, string> = {
    ativo: 'Ativo',
    inadimplente: 'Inadimplente',
    vencendo: 'Renovação <60d',
    cancelado: 'Cancelado',
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[10px] font-bold whitespace-nowrap tracking-wide',
      'before:content-[""] before:w-[5px] before:h-[5px] before:rounded-full before:shrink-0',
      styles[status]
    )}>
      {labels[status]}
    </span>
  )
}

export function LevelBadge({ level }: { level: MemberLevel }) {
  const styles: Record<MemberLevel, string> = {
    BRONZE: 'bg-[hsl(25,55%,40%)]/25 text-[hsl(25,60%,68%)]',
    PRATA: 'bg-[hsl(220,10%,50%)]/20 text-[hsl(220,10%,78%)]',
    OURO: 'bg-[hsl(44,90%,48%)]/20 text-[hsl(44,90%,63%)]',
  }
  return (
    <span className={cn('inline-block px-[7px] py-[2px] rounded-[4px] text-[9.5px] font-extrabold tracking-wide', styles[level])}>
      {level}
    </span>
  )
}

interface TagBadgeProps {
  children: React.ReactNode
  color?: 'green' | 'red' | 'amber' | 'blue' | 'default'
}

const tagColors = {
  green: 'bg-[#34D399]/15 text-[#34D399]',
  red: 'bg-[hsl(355,82%,51%)]/15 text-[hsl(355,82%,51%)]',
  amber: 'bg-[#F59E0B]/15 text-[#F59E0B]',
  blue: 'bg-[#60A5FA]/15 text-[#60A5FA]',
  default: 'bg-muted/20 text-muted-foreground',
}

export function TagBadge({ children, color = 'default' }: TagBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-[7px] py-[2px] rounded-full text-[9.5px] font-bold whitespace-nowrap', tagColors[color])}>
      {children}
    </span>
  )
}
