import React from 'react'
import { cn } from './utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'light' | 'dark' | 'purple'
  hover?: boolean
}

export function GlassCard({ 
  children, 
  className = '',
  variant = 'default',
  hover = true
}: GlassCardProps) {
  const variants = {
    default: 'bg-card border-border',
    light: 'bg-white dark:bg-card border-border',
    dark: 'bg-slate-800 dark:bg-slate-900 border-border',
    purple: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800'
  }

  return (
    <div className={cn(
      'border rounded-xl shadow-sm',
      variants[variant],
      hover && 'hover:shadow-md transition-all duration-300',
      className
    )}>
      {children}
    </div>
  )
}

export function GlassButton({ 
  children, 
  className = '',
  variant = 'default',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'primary' | 'secondary' | 'danger'
}) {
  const variants = {
    default: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-border',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary',
    secondary: 'bg-muted text-muted-foreground hover:bg-muted/80 border-border',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive'
  }

  return (
    <button 
      className={cn(
        'border rounded-lg px-4 py-2 font-medium transition-all duration-200 hover:shadow-sm',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}