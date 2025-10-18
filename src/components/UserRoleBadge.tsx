import React from 'react'
import { Shield, GraduationCap, Crown } from 'lucide-react'
import { AuthService } from '../utils/auth'

interface UserRoleBadgeProps {
  role: 'student' | 'instructor' | 'admin'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function UserRoleBadge({ role, size = 'md', showIcon = true, className = '' }: UserRoleBadgeProps) {
  const baseClasses = AuthService.getRoleBadgeColor(role)
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  }

  const roleIcons = {
    student: GraduationCap,
    instructor: Shield,
    admin: Crown
  }

  const Icon = roleIcons[role]

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ${baseClasses} ${sizeClasses[size]} ${className}`}>
      {showIcon && <Icon className={iconSizes[size]} />}
      {AuthService.getRoleDisplayName(role)}
    </span>
  )
}

interface UserRoleIndicatorProps {
  role: 'student' | 'instructor' | 'admin'
  name: string
  size?: 'sm' | 'md' | 'lg'
  layout?: 'horizontal' | 'vertical'
}

export function UserRoleIndicator({ role, name, size = 'md', layout = 'horizontal' }: UserRoleIndicatorProps) {
  const roleColors = {
    student: 'text-blue-600',
    instructor: 'text-green-600', 
    admin: 'text-purple-600'
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  if (layout === 'vertical') {
    return (
      <div className="text-center">
        <div className={`font-semibold text-gray-900 ${textSizes[size]}`}>
          {name}
        </div>
        <UserRoleBadge role={role} size={size} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`font-semibold text-gray-900 ${textSizes[size]}`}>
        {name}
      </span>
      <UserRoleBadge role={role} size={size} />
    </div>
  )
}