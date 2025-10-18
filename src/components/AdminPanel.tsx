import React, { useState, useEffect } from 'react'
import { Users, Activity, Settings, BarChart } from 'lucide-react'
import { projectId } from '../utils/supabase/info'
import { DebugUser } from './DebugUser'

interface User {
  id: string
  name: string
  email: string
  role: 'student' | 'instructor' | 'admin'
  status?: 'active' | 'suspended' | 'banned'
  access_token?: string
  created_at: string
  last_login?: string
  followers?: number
  following?: number
}

interface AdminPanelProps {
  user: User
  onNavigate: (page: string) => void
}

export function AdminPanel({ user, onNavigate }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    students: 0,
    instructors: 0,
    admins: 0
  })
  const [loading, setLoading] = useState(true)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { users: allUsers } = await response.json()
        setUsers(allUsers)
        
        const stats = {
          totalUsers: allUsers.length,
          students: allUsers.filter((u: User) => u.role === 'student').length,
          instructors: allUsers.filter((u: User) => u.role === 'instructor').length,
          admins: allUsers.filter((u: User) => u.role === 'admin').length
        }
        setStats(stats)
      } else {
        console.error('Failed to load admin data:', response.status)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor': return 'bg-accent/20 text-primary border border-accent/30'
      case 'admin': return 'bg-primary/20 text-primary border border-primary/30'
      default: return 'bg-secondary text-secondary-foreground border border-border'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border border-green-200'
      case 'suspended': return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
      case 'banned': return 'bg-destructive/10 text-destructive border border-destructive/20'
      default: return 'bg-secondary text-secondary-foreground border border-border'
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUser(userId)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        await loadAdminData() // Reload data
        console.log(`User role updated to ${newRole}`)
      } else {
        console.error('Failed to update user role')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
    } finally {
      setUpdatingUser(null)
    }
  }

  const updateUserStatus = async (userId: string, newStatus: string) => {
    setUpdatingUser(userId)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        await loadAdminData() 
        console.log(`User status updated to ${newStatus}`)
      } else {
        console.error('Failed to update user status')
      }
    } catch (error) {
      console.error('Error updating user status:', error)
    } finally {
      setUpdatingUser(null)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users and platform settings</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="post-card p-6 text-center hover:shadow-lg transition-all duration-200">
          <Users className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
          <p className="text-muted-foreground">Total Users</p>
        </div>

        <div className="post-card p-6 text-center hover:shadow-lg transition-all duration-200">
          <Users className="h-8 w-8 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.students}</p>
          <p className="text-muted-foreground">Students</p>
        </div>

        <div className="post-card p-6 text-center hover:shadow-lg transition-all duration-200">
          <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.instructors}</p>
          <p className="text-muted-foreground">Instructors</p>
        </div>

        <div className="post-card p-6 text-center hover:shadow-lg transition-all duration-200">
          <Settings className="h-8 w-8 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.admins}</p>
          <p className="text-muted-foreground">Admins</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="post-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Platform Users</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Name</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Email</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Role</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Status</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Actions</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((userData) => (
                <tr key={userData.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="avatar-gradient w-8 h-8 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {userData.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{userData.name}</div>
                        {userData.followers !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            {userData.followers} followers • {userData.following} following
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-foreground">{userData.email}</td>
                  <td className="py-4 px-6">
                    {updatingUser === userData.id ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <select
                        value={userData.role}
                        onChange={(e) => updateUserRole(userData.id, e.target.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all hover:shadow-sm ${getRoleColor(userData.role)}`}
                        disabled={userData.id === user.id} // Can't change own role
                      >
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {updatingUser === userData.id ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <select
                        value={userData.status || 'active'}
                        onChange={(e) => updateUserStatus(userData.id, e.target.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all hover:shadow-sm ${getStatusColor(userData.status || 'active')}`}
                        disabled={userData.id === user.id} // Can't change own status
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                      </select>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onNavigate('account', userData.id)}
                        className="text-xs px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all duration-200 border border-primary/20"
                      >
                        View Profile
                      </button>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-muted-foreground text-sm">
                    <div>{formatDate(userData.created_at)}</div>
                    {userData.last_login && (
                      <div className="text-xs text-muted-foreground/70">
                        Last: {formatDate(userData.last_login)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}