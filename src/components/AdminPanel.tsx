import React, { useState, useEffect } from 'react'
import { Users, Activity, Settings, BarChart, RefreshCw, Trash2, UserPlus, X, Mail, Clock, Send, XCircle } from 'lucide-react'
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

interface Invitation {
  token: string
  email: string
  role: string
  invitedBy: string
  sentAt: string
  expiresAt: string
  isExpired: boolean
}

interface AdminPanelProps {
  user: User
  onNavigate: (page: string) => void
}

export function AdminPanel({ user, onNavigate }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    students: 0,
    instructors: 0,
    admins: 0
  })
  const [loading, setLoading] = useState(true)
  const [loadingInvitations, setLoadingInvitations] = useState(true)
  const [updatingUser, setUpdatingUser] = useState<string | null>(null)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addUserMethod, setAddUserMethod] = useState<'manual' | 'invitation'>('manual')
  const [resendingToken, setResendingToken] = useState<string | null>(null)
  const [cancellingToken, setCancellingToken] = useState<string | null>(null)

  useEffect(() => {
    loadAdminData()
    loadInvitations()
  }, [])

  const loadAdminData = async () => {
    try {
      setRefreshing(true)
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
      setRefreshing(false)
    }
  }

  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true)
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/invitations`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { invitations: allInvitations } = await response.json()
        setInvitations(allInvitations || [])
      } else {
        console.error('Failed to load invitations:', response.status)
      }
    } catch (error) {
      console.error('Error loading invitations:', error)
    } finally {
      setLoadingInvitations(false)
    }
  }

  const resendInvitation = async (token: string) => {
    setResendingToken(token)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/invitations/${token}/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        alert('Invitation resent successfully!')
        await loadInvitations()
      } else {
        const error = await response.json()
        alert(`Failed to resend invitation: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
      alert('Error resending invitation. Please try again.')
    } finally {
      setResendingToken(null)
    }
  }

  const cancelInvitation = async (token: string, email: string) => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${email}?`)) {
      return
    }

    setCancellingToken(token)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/invitations/${token}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        await loadInvitations()
      } else {
        const error = await response.json()
        alert(`Failed to cancel invitation: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      alert('Error cancelling invitation. Please try again.')
    } finally {
      setCancellingToken(null)
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
        await loadAdminData() // Reload data
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

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${userName}? This action cannot be undone and will remove the user from both Deno KV and Supabase Auth.`)) {
      return
    }

    setDeletingUser(userId)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        await loadAdminData() // Reload data
        console.log(`User ${userName} deleted successfully`)
        alert(`User ${userName} has been permanently deleted from both KV and Auth.`)
      } else {
        const error = await response.json()
        console.error('Failed to delete user:', error)
        alert(`Failed to delete user: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error deleting user. Please try again.')
    } finally {
      setDeletingUser(null)
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
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users and platform settings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-all duration-200"
          >
            <UserPlus className="h-4 w-4" />
            Add New User
          </button>
          <button
            onClick={loadAdminData}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
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

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="post-card overflow-hidden mb-8">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Mail className="h-5 w-5 text-accent" />
                  Pending Invitations
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {invitations.length} invitation{invitations.length !== 1 ? 's' : ''} awaiting response
                </p>
              </div>
              <button
                onClick={loadInvitations}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loadingInvitations ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Email</th>
                  <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Role</th>
                  <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Invited By</th>
                  <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Sent</th>
                  <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Status</th>
                  <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitations.map((invitation) => (
                  <tr key={invitation.token} className="hover:bg-secondary/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-foreground truncate max-w-xs">{invitation.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${getRoleColor(invitation.role)}`}>
                        {invitation.role}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-sm">
                      {invitation.invitedBy}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-sm">
                      {formatDate(invitation.sentAt)}
                    </td>
                    <td className="py-4 px-6">
                      {invitation.isExpired ? (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                          Expired
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => resendInvitation(invitation.token)}
                          disabled={resendingToken === invitation.token}
                          className="text-xs px-3 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-all duration-200 border border-accent/20 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {resendingToken === invitation.token ? (
                            <>
                              <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Resend
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => cancelInvitation(invitation.token, invitation.email)}
                          disabled={cancellingToken === invitation.token}
                          className="text-xs px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-all duration-200 border border-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {cancellingToken === invitation.token ? (
                            <>
                              <div className="w-3 h-3 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
                              Cancelling...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              Cancel
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-border">
            {invitations.map((invitation) => (
              <div key={invitation.token} className="p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-foreground font-medium mb-1 truncate">{invitation.email}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getRoleColor(invitation.role)}`}>
                        {invitation.role}
                      </span>
                      {invitation.isExpired ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                          Expired
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mb-3 text-sm text-muted-foreground">
                  <div>Invited by: {invitation.invitedBy}</div>
                  <div>Sent: {formatDate(invitation.sentAt)}</div>
                  <div>Expires: {formatDate(invitation.expiresAt)}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resendInvitation(invitation.token)}
                    disabled={resendingToken === invitation.token}
                    className="flex-1 text-sm px-4 py-2.5 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-all duration-200 border border-accent/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {resendingToken === invitation.token ? (
                      <>
                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Resend
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => cancelInvitation(invitation.token, invitation.email)}
                    disabled={cancellingToken === invitation.token}
                    className="flex-1 text-sm px-4 py-2.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-all duration-200 border border-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cancellingToken === invitation.token ? (
                      <>
                        <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Cancel
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table/Cards - Responsive */}
      <div className="post-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Platform Users</h2>
          <p className="text-sm text-muted-foreground mt-1">{users.length} total users</p>
        </div>
        
        {/* Desktop Table View - Hidden on mobile */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Name</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Email</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Role</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Status</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Joined</th>
                <th className="text-left py-3 px-6 font-medium text-secondary-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((userData) => (
                <tr key={userData.id} className="hover:bg-secondary/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      <div className="avatar-gradient w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-white">
                          {userData.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground truncate">{userData.name}</div>
                        {userData.followers !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            {userData.followers} followers • {userData.following} following
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-foreground truncate max-w-xs">{userData.email}</div>
                  </td>
                  <td className="py-4 px-6">
                    {updatingUser === userData.id ? (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <select
                        value={userData.role}
                        onChange={(e) => updateUserRole(userData.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all hover:shadow-sm ${getRoleColor(userData.role)}`}
                        disabled={userData.id === user.id}
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all hover:shadow-sm ${getStatusColor(userData.status || 'active')}`}
                        disabled={userData.id === user.id}
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                      </select>
                    )}
                  </td>
                  <td className="py-4 px-6 text-muted-foreground text-sm">
                    <div>{formatDate(userData.created_at)}</div>
                    {userData.last_login && (
                      <div className="text-xs text-muted-foreground/70">
                        Last: {formatDate(userData.last_login)}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onNavigate('account', userData.id)}
                        className="text-xs px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all duration-200 border border-primary/20 whitespace-nowrap"
                      >
                        View Profile
                      </button>
                      {userData.id !== user.id && (
                        <button
                          onClick={() => deleteUser(userData.id, userData.name)}
                          disabled={deletingUser === userData.id}
                          className="text-xs px-3 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-all duration-200 border border-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {deletingUser === userData.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Hidden on desktop */}
        <div className="lg:hidden divide-y divide-border">
          {users.map((userData) => (
            <div key={userData.id} className="p-4 hover:bg-secondary/50 transition-colors">
              {/* User Header */}
              <div className="flex items-start space-x-3 mb-4">
                <div className="avatar-gradient w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-medium text-white">
                    {userData.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground mb-1">{userData.name}</div>
                  <div className="text-sm text-muted-foreground truncate mb-1">{userData.email}</div>
                  {userData.followers !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      {userData.followers} followers • {userData.following} following
                    </div>
                  )}
                </div>
              </div>

              {/* User Details Grid */}
              <div className="space-y-3 mb-4">
                {/* Role */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Role:</span>
                  {updatingUser === userData.id ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <select
                      value={userData.role}
                      onChange={(e) => updateUserRole(userData.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all hover:shadow-sm ${getRoleColor(userData.role)}`}
                      disabled={userData.id === user.id}
                    >
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {updatingUser === userData.id ? (
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <select
                      value={userData.status || 'active'}
                      onChange={(e) => updateUserStatus(userData.id, e.target.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all hover:shadow-sm ${getStatusColor(userData.status || 'active')}`}
                      disabled={userData.id === user.id}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                    </select>
                  )}
                </div>

                {/* Joined Date */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Joined:</span>
                  <span className="text-sm text-foreground">{formatDate(userData.created_at)}</span>
                </div>

                {/* Last Login */}
                {userData.last_login && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Login:</span>
                    <span className="text-sm text-foreground">{formatDate(userData.last_login)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => onNavigate('account', userData.id)}
                  className="flex-1 text-sm px-4 py-2.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all duration-200 border border-primary/20 touch-target"
                >
                  View Profile
                </button>
                {userData.id !== user.id && (
                  <button
                    onClick={() => deleteUser(userData.id, userData.name)}
                    disabled={deletingUser === userData.id}
                    className="flex-1 text-sm px-4 py-2.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-all duration-200 border border-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-target"
                  >
                    {deletingUser === userData.id ? (
                      <>
                        <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Delete User
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <AddUserModal
          user={user}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => {
            loadAdminData()
            loadInvitations()
          }}
        />
      )}
    </div>
  )
}

// Add User Modal Component
function AddUserModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
  const [method, setMethod] = useState<'manual' | 'invitation'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempPassword, setTempPassword] = useState('');

  // Manual registration form
  const [manualForm, setManualForm] = useState({
    name: '',
    email: '',
    role: 'student' as 'student' | 'instructor' | 'admin',
  });

  // Invitation form
  const [invitationForm, setInvitationForm] = useState({
    email: '',
    role: 'student' as 'student' | 'instructor' | 'admin',
  });

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setTempPassword('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(manualForm),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`User created successfully!`);
        setTempPassword(data.temporaryPassword);
        setManualForm({ name: '', email: '', role: 'student' });
        onSuccess();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('An error occurred while creating the user');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/send-invitation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitationForm),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Invitation sent successfully to ${invitationForm.email}!`);
        setInvitationForm({ email: '', role: 'student' });
      } else {
        setError(data.error || 'Failed to send invitation');
      }
    } catch (err) {
      setError('An error occurred while sending the invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="post-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="text-2xl font-bold text-foreground">Add New User</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Method Toggle */}
        <div className="p-6 border-b border-border">
          <div className="flex bg-secondary rounded-xl p-1">
            <button
              onClick={() => {
                setMethod('manual');
                setError('');
                setSuccess('');
                setTempPassword('');
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-300 ${
                method === 'manual'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Manual Registration
            </button>
            <button
              onClick={() => {
                setMethod('invitation');
                setError('');
                setSuccess('');
                setTempPassword('');
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-300 ${
                method === 'invitation'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Send Invitation
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {method === 'manual' ? (
            <form onSubmit={handleManualCreate} className="space-y-4">
              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={manualForm.name}
                  onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                  className="input-clean w-full px-4 py-3"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={manualForm.email}
                  onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                  className="input-clean w-full px-4 py-3"
                  placeholder="user@asiancollege.edu.ph"
                />
                <p className="text-xs text-muted-foreground mt-1">

                </p>
              </div>

              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Role *
                </label>
                <select
                  value={manualForm.role}
                  onChange={(e) => setManualForm({ ...manualForm, role: e.target.value as any })}
                  className="input-clean w-full px-4 py-3"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {tempPassword && (
                <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-foreground mb-2">
                    Temporary Password (share this with the user):
                  </p>
                  <div className="bg-card p-3 rounded-lg border border-border">
                    <code className="text-accent font-mono">{tempPassword}</code>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    The user must change this password after first sign-in.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-primary text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gradient px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Creating User...' : 'Create User'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={invitationForm.email}
                  onChange={(e) => setInvitationForm({ ...invitationForm, email: e.target.value })}
                  className="input-clean w-full px-4 py-3"
                  placeholder="user@asiancollege.edu.ph"
                />

              </div>

              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Role *
                </label>
                <select
                  value={invitationForm.role}
                  onChange={(e) => setInvitationForm({ ...invitationForm, role: e.target.value as any })}
                  className="input-clean w-full px-4 py-3"
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="bg-secondary/50 border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  An invitation email will be sent to the user with a link to set their password and complete registration. The invitation link will be valid for 7 days.
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-primary text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-gradient px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Sending Invitation...' : 'Send Invitation'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}