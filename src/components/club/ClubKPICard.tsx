import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ClubKPICardProps {
  label: string
  value: ReactNode
  meta?: ReactNode
  color?: 'default' | 'green' | 'amber' | 'red'
  progress?: number
}

const colorMap = {
  default: 'text-foreground',
  green: 'text-[#34D399]',
  amber: 'text-[#F59E0B]',
  red: 'text-[hsl(355,82%,51%)]',
}

export function ClubKPICard({ label, value, meta, color = 'default', progress }: ClubKPICardProps) {
  return (
    <div className="bg-card border border-border rounded-[0.85rem] p-4 flex flex-col gap-1.5 relative overflow-hidden hover:border-[hsl(355,82%,51%)/30] transition-colors">
      <div className="text-[9.5px] font-semibold tracking-[0.1em] uppercase text-muted-foreground">
        {label}
      </div>
      <div className={cn('font-["Barlow_Condensed",sans-serif] text-[28px] font-extrabold leading-none', colorMap[color])}>
        {value}
      </div>
      {meta && (
        <div className="text-[10.5px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
          {meta}
        </div>
      )}
      {progress !== undefined && (
        <div className="h-[3px] rounded-full bg-border overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress)}%`, background: 'var(--club-grad)' }}
          />
        </div>
      )}
    </div>
  )
}
