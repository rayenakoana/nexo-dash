import { ReactNode } from 'react'

// Wraps Club ERP pages with the red CS Club color scheme
export function ClubShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-full"
      style={
        {
          '--club-primary': 'hsl(355,82%,51%)',
          '--club-primary-soft': 'hsl(355,82%,51%,0.12)',
          '--club-grad': 'linear-gradient(135deg, hsl(355,82%,51%), hsl(355,72%,31%))',
          '--club-green': '#34D399',
          '--club-amber': '#F59E0B',
          '--club-blue': '#60A5FA',
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
