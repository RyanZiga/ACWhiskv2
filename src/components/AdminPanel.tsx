import React, { useState, useEffect } from 'react'
import { Users, Activity, Settings, BarChart, RefreshCw, Trash2, UserPlus, X, Mail, Clock, Send, XCircle, FileText, MessageSquare, Star, AlertTriangle, Eye, Search, Calendar, Filter, CheckSquare, Square, Edit3, EyeOff, History, XOctagon } from 'lucide-react'
import { projectId } from '../utils/supabase/info'
import { DebugUser } from './DebugUser'
import { toast } from 'sonner@2.0.3'
import { Calendar as CalendarComponent } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { format } from 'date-fns'

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

interface ContentPost {
  id: string
  author_id: string
  author_name: string
  author_role: string
  content: string
  type: 'recipe' | 'regular'
  privacy?: string
  created_at: string
  images?: string[]
  recipe_data?: any
  likes?: any[]
  comments?: Comment[]
  ratings?: Rating[]
}

interface Comment {
  id: string
  content: string
  user_name: string
  created_at: string
  hidden?: boolean
}

interface Rating {
  user_name: string
  rating: number
  created_at: string
}

interface Warning {
  id: string
  user_id: string
  user_name: string
  reason: string
  post_id?: string
  issued_at: string
  issued_by: string
  status: 'active' | 'appealed' | 'dismissed'
  appeal_message?: string
}

interface AdminPanelProps {
  user: User
  onNavigate: (page: string) => void
}

export function AdminPanel({ user, onNavigate }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'content'>('users')
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
        await loadAdminData() 
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
        await loadAdminData() 
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users and platform content</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'users' && (
            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-all duration-200"
            >
              <UserPlus className="h-4 w-4" />
              Add New User
            </button>
          )}
          <button
            onClick={activeTab === 'users' ? loadAdminData : () => window.location.reload()}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>


      <div className="mb-8">
        <div className="flex gap-2 border-b border-border">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'users'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <Users className="h-4 w-4" />
            User Management
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'content'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            <FileText className="h-4 w-4" />
            Content Management
          </button>
        </div>
      </div>


      {activeTab === 'users' ? (
        <>

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


      <div className="post-card overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Platform Users</h2>
          <p className="text-sm text-muted-foreground mt-1">{users.length} total users</p>
        </div>
        

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


        <div className="lg:hidden divide-y divide-border">
          {users.map((userData) => (
            <div key={userData.id} className="p-4 hover:bg-secondary/50 transition-colors">

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


              <div className="space-y-3 mb-4">

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


                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Joined:</span>
                  <span className="text-sm text-foreground">{formatDate(userData.created_at)}</span>
                </div>


                {userData.last_login && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Login:</span>
                    <span className="text-sm text-foreground">{formatDate(userData.last_login)}</span>
                  </div>
                )}
              </div>


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
        </>
      ) : (
        <ContentManagement user={user} onNavigate={onNavigate} />
      )}
    </div>
  )
}


function AddUserModal({ user, onClose, onSuccess }: { user: any; onClose: () => void; onSuccess: () => void }) {
  const [method, setMethod] = useState<'manual' | 'invitation'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tempPassword, setTempPassword] = useState('');


  const [manualForm, setManualForm] = useState({
    name: '',
    email: '',
    role: 'student' as 'student' | 'instructor' | 'admin',
  });


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

        <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="text-2xl font-bold text-foreground">Add New User</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


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
                  Use Asian College Email Address
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


interface ContentPost {
  id: string
  author_id: string
  author_name: string
  author_role: string
  author_avatar?: string
  type: 'recipe' | 'regular'
  content: string
  images?: string[]
  created_at: string
  likes: string[]
  comments: Array<{
    id: string
    content: string
    user_id: string
    user_name: string
    created_at: string
  }>
  ratings?: Array<{
    user_id: string
    user_name: string
    rating: number
    created_at: string
  }>
  recipe_data?: any
  privacy?: 'public' | 'followers' | 'private'
}

interface Warning {
  id: string
  user_id: string
  user_name: string
  reason: string
  issued_by: string
  issued_at: string
  post_id?: string
}

function ContentManagement({ user, onNavigate }: { user: any; onNavigate: (page: string, userId?: string) => void }) {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingPost, setDeletingPost] = useState<string | null>(null)
  const [warningModal, setWarningModal] = useState<{ postId: string; userId: string; userName: string } | null>(null)
  const [issuingWarning, setIssuingWarning] = useState(false)
  const [warningReason, setWarningReason] = useState('')
  const [expandedPost, setExpandedPost] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'recipe' | 'regular'>('all')
  const [stats, setStats] = useState({
    totalPosts: 0,
    recipePosts: 0,
    regularPosts: 0,
    totalComments: 0,
    totalRatings: 0
  })
  

  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkWarning, setBulkWarning] = useState(false)
  

  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>()
  const [dateTo, setDateTo] = useState<Date | undefined>()
  const [authorRoleFilter, setAuthorRoleFilter] = useState<string>('all')
  const [privacyFilter, setPrivacyFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  

  const [warningsHistory, setWarningsHistory] = useState<Warning[]>([])
  const [showWarningsHistory, setShowWarningsHistory] = useState(false)
  const [selectedUserWarnings, setSelectedUserWarnings] = useState<string | null>(null)
  

  const [editingComment, setEditingComment] = useState<{ postId: string; commentId: string; content: string } | null>(null)
  const [hidingComment, setHidingComment] = useState<string | null>(null)

  useEffect(() => {
    loadContent()
    loadWarningsHistory()
  }, [])

  const loadContent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/content`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { posts: allPosts } = await response.json()
        setPosts(allPosts)
        

        const totalComments = allPosts.reduce((sum: number, post: ContentPost) => sum + (post.comments?.length || 0), 0)
        const totalRatings = allPosts.reduce((sum: number, post: ContentPost) => sum + (post.ratings?.length || 0), 0)
        
        setStats({
          totalPosts: allPosts.length,
          recipePosts: allPosts.filter((p: ContentPost) => p.type === 'recipe').length,
          regularPosts: allPosts.filter((p: ContentPost) => p.type === 'regular').length,
          totalComments,
          totalRatings
        })
      } else {
        console.error('Failed to load content:', response.status)
      }
    } catch (error) {
      console.error('Error loading content:', error)
    } finally {
      setLoading(false)
    }
  }

  const deletePost = async (postId: string, postAuthor: string) => {
    if (!confirm(`Are you sure you want to delete this post by ${postAuthor}? This action cannot be undone.`)) {
      return
    }

    setDeletingPost(postId)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        await loadContent()
        alert('Post deleted successfully')
      } else {
        const error = await response.json()
        alert(`Failed to delete post: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Error deleting post. Please try again.')
    } finally {
      setDeletingPost(null)
    }
  }

  const issueWarning = async () => {
    if (!warningReason.trim()) {
      toast.error('Please provide a reason for the warning')
      return
    }

    setIssuingWarning(true)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/warn-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: warningModal!.userId,
          reason: warningReason,
          post_id: warningModal!.postId,
          send_email: true // Enable email notification
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Warning issued to ${warningModal!.userName}`, {
          description: 'Email notification sent to user'
        })
        setWarningModal(null)
        setWarningReason('')
        loadWarningsHistory()
      } else {
        const error = await response.json()
        toast.error(`Failed to issue warning: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error issuing warning:', error)
      toast.error('Error issuing warning. Please try again.')
    } finally {
      setIssuingWarning(false)
    }
  }

  // Bulk delete posts
  const bulkDeletePosts = async () => {
    if (selectedPosts.size === 0) {
      toast.error('No posts selected')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedPosts.size} post(s)? This action cannot be undone.`)) {
      return
    }

    setBulkDeleting(true)
    try {
      const deletePromises = Array.from(selectedPosts).map(postId =>
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/posts/${postId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        })
      )

      const results = await Promise.all(deletePromises)
      const successCount = results.filter(r => r.ok).length
      
      toast.success(`${successCount} post(s) deleted successfully`)
      setSelectedPosts(new Set())
      await loadContent()
    } catch (error) {
      console.error('Error deleting posts:', error)
      toast.error('Error deleting posts. Please try again.')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Bulk warn users
  const bulkWarnUsers = async () => {
    if (selectedPosts.size === 0) {
      toast.error('No posts selected')
      return
    }

    const reason = prompt('Enter warning reason for all selected post authors:')
    if (!reason?.trim()) return

    setBulkWarning(true)
    try {
      // Get unique user IDs from selected posts
      const selectedPostData = posts.filter(p => selectedPosts.has(p.id))
      const uniqueUsers = new Map<string, { id: string; name: string; postIds: string[] }>()
      
      selectedPostData.forEach(post => {
        if (!uniqueUsers.has(post.author_id)) {
          uniqueUsers.set(post.author_id, {
            id: post.author_id,
            name: post.author_name,
            postIds: [post.id]
          })
        } else {
          uniqueUsers.get(post.author_id)!.postIds.push(post.id)
        }
      })

      const warnPromises = Array.from(uniqueUsers.values()).map(userInfo =>
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/warn-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userInfo.id,
            reason: reason,
            post_id: userInfo.postIds[0],
            send_email: true
          })
        })
      )

      const results = await Promise.all(warnPromises)
      const successCount = results.filter(r => r.ok).length
      
      toast.success(`${successCount} user(s) warned successfully`, {
        description: 'Email notifications sent'
      })
      setSelectedPosts(new Set())
      loadWarningsHistory()
    } catch (error) {
      console.error('Error warning users:', error)
      toast.error('Error warning users. Please try again.')
    } finally {
      setBulkWarning(false)
    }
  }

  // Load warnings history
  const loadWarningsHistory = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/warnings`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { warnings } = await response.json()
        setWarningsHistory(warnings || [])
      }
    } catch (error) {
      console.error('Error loading warnings:', error)
    }
  }

  // Delete comment
  const deleteComment = async (postId: string, commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Comment deleted')
        await loadContent()
      } else {
        toast.error('Failed to delete comment')
      }
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast.error('Error deleting comment')
    }
  }

  // Edit comment
  const saveEditedComment = async () => {
    if (!editingComment) return

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/posts/${editingComment.postId}/comments/${editingComment.commentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: editingComment.content })
      })

      if (response.ok) {
        toast.success('Comment updated')
        setEditingComment(null)
        await loadContent()
      } else {
        toast.error('Failed to update comment')
      }
    } catch (error) {
      console.error('Error updating comment:', error)
      toast.error('Error updating comment')
    }
  }

  // Hide/unhide comment
  const toggleCommentVisibility = async (postId: string, commentId: string, currentlyHidden: boolean) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/posts/${postId}/comments/${commentId}/visibility`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ hidden: !currentlyHidden })
      })

      if (response.ok) {
        toast.success(currentlyHidden ? 'Comment shown' : 'Comment hidden')
        await loadContent()
      } else {
        toast.error('Failed to update comment visibility')
      }
    } catch (error) {
      console.error('Error updating comment visibility:', error)
      toast.error('Error updating comment visibility')
    }
  }

  // Toggle post selection
  const togglePostSelection = (postId: string) => {
    const newSelection = new Set(selectedPosts)
    if (newSelection.has(postId)) {
      newSelection.delete(postId)
    } else {
      newSelection.add(postId)
    }
    setSelectedPosts(newSelection)
  }

  // Select all posts
  const toggleSelectAll = () => {
    if (selectedPosts.size === filteredPosts.length) {
      setSelectedPosts(new Set())
    } else {
      setSelectedPosts(new Set(filteredPosts.map(p => p.id)))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Enhanced filtering logic
  const filteredPosts = posts.filter(post => {
    // Type filter
    if (filterType !== 'all' && post.type !== filterType) return false
    
    // Search query
    if (searchQuery && !post.content.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !post.author_name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    
    // Date range filter
    if (dateFrom) {
      const postDate = new Date(post.created_at)
      if (postDate < dateFrom) return false
    }
    if (dateTo) {
      const postDate = new Date(post.created_at)
      if (postDate > dateTo) return false
    }
    
    // Author role filter
    if (authorRoleFilter !== 'all' && post.author_role !== authorRoleFilter) {
      return false
    }
    
    // Privacy filter
    if (privacyFilter !== 'all') {
      const postPrivacy = post.privacy || 'public'
      if (postPrivacy !== privacyFilter) return false
    }
    
    return true
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading content...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="post-card p-6 text-center hover:shadow-lg transition-all duration-200">
          <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.totalPosts}</p>
          <p className="text-muted-foreground">Total Posts</p>
        </div>

        <div className="post-card p-6 text-center hover:shadow-lg transition-all duration-200">
          <Star className="h-8 w-8 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.recipePosts}</p>
          <p className="text-muted-foreground">Recipe Posts</p>
        </div>

        <div className="post-card p-6 text-center hover:shadow-lg transition-all duration-200">
          <Activity className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.regularPosts}</p>
          <p className="text-muted-foreground">Regular Posts</p>
        </div>

        <div className="post-card p-6 text-center hover:shadow-lg transition-all duration-200">
          <MessageSquare className="h-8 w-8 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.totalComments}</p>
          <p className="text-muted-foreground">Comments</p>
        </div>

        <div className="post-card p-6 text-center hover:shadow-lg transition-all duration-200">
          <Star className="h-8 w-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.totalRatings}</p>
          <p className="text-muted-foreground">Ratings</p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedPosts.size > 0 && (
        <div className="mb-6 post-card p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">
                {selectedPosts.size} post(s) selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={bulkWarnUsers}
                disabled={bulkWarning}
                className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-all disabled:opacity-50"
              >
                <AlertTriangle className="h-4 w-4" />
                {bulkWarning ? 'Warning...' : 'Warn Users'}
              </button>
              <button
                onClick={bulkDeletePosts}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-all disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {bulkDeleting ? 'Deleting...' : 'Delete Posts'}
              </button>
              <button
                onClick={() => setSelectedPosts(new Set())}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search posts by content or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-clean w-full pl-10 pr-4 py-2"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              showFilters ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            <Filter className="h-4 w-4" />
            Advanced Filters
          </button>
          <button
            onClick={() => setShowWarningsHistory(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-all"
          >
            <History className="h-4 w-4" />
            Warning History ({warningsHistory.length})
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="post-card p-6 space-y-4">
            <h3 className="font-medium text-foreground mb-4">Advanced Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date From
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="input-clean w-full px-3 py-2 text-left flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PP') : 'Select date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Date To
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="input-clean w-full px-3 py-2 text-left flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {dateTo ? format(dateTo, 'PP') : 'Select date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Author Role */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Author Role
                </label>
                <select
                  value={authorRoleFilter}
                  onChange={(e) => setAuthorRoleFilter(e.target.value)}
                  className="input-clean w-full px-3 py-2"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="instructor">Instructors</option>
                  <option value="admin">Admins</option>
                </select>
              </div>

              {/* Privacy Level */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Privacy Level
                </label>
                <select
                  value={privacyFilter}
                  onChange={(e) => setPrivacyFilter(e.target.value)}
                  className="input-clean w-full px-3 py-2"
                >
                  <option value="all">All Privacy Levels</option>
                  <option value="public">Public</option>
                  <option value="followers">Followers Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setDateFrom(undefined)
                  setDateTo(undefined)
                  setAuthorRoleFilter('all')
                  setPrivacyFilter('all')
                  setSearchQuery('')
                }}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all"
            title={selectedPosts.size === filteredPosts.length ? 'Deselect All' : 'Select All'}
          >
            {selectedPosts.size === filteredPosts.length && filteredPosts.length > 0 ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            Select All
          </button>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All Posts ({stats.totalPosts})
          </button>
          <button
            onClick={() => setFilterType('recipe')}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              filterType === 'recipe'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Recipe Posts ({stats.recipePosts})
          </button>
          <button
            onClick={() => setFilterType('regular')}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              filterType === 'regular'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Regular Posts ({stats.regularPosts})
          </button>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-6">
        {filteredPosts.length === 0 ? (
          <div className="post-card p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No posts found</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className="post-card overflow-hidden">
              {/* Post Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Checkbox for bulk selection */}
                    <button
                      onClick={() => togglePostSelection(post.id)}
                      className="mt-1 p-2 hover:bg-secondary rounded-lg transition-colors"
                    >
                      {selectedPosts.has(post.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <div className="avatar-gradient w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-medium text-white">
                        {post.author_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => onNavigate('account', post.author_id)}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {post.author_name}
                        </button>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          post.author_role === 'instructor'
                            ? 'bg-accent/20 text-primary border border-accent/30'
                            : post.author_role === 'admin'
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-secondary text-secondary-foreground border border-border'
                        }`}>
                          {post.author_role}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          post.type === 'recipe'
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'bg-secondary text-secondary-foreground border border-border'
                        }`}>
                          {post.type}
                        </span>
                        {post.privacy && post.privacy !== 'public' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                            {post.privacy}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{formatDate(post.created_at)}</p>
                      <p className="text-sm text-muted-foreground">Post ID: {post.id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Post Content */}
              <div className="p-6 border-b border-border">
                <p className="text-foreground whitespace-pre-wrap mb-4">{post.content}</p>
                
                {/* Images */}
                {post.images && post.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
                    {post.images.map((image, idx) => (
                      <img
                        key={idx}
                        src={image}
                        alt={`Post image ${idx + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                {/* Recipe Data Preview */}
                {post.type === 'recipe' && post.recipe_data && (
                  <div className="bg-secondary/50 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-foreground mb-2">Recipe Details</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {post.recipe_data.prepTime && <p>Prep Time: {post.recipe_data.prepTime}</p>}
                      {post.recipe_data.cookTime && <p>Cook Time: {post.recipe_data.cookTime}</p>}
                      {post.recipe_data.servings && <p>Servings: {post.recipe_data.servings}</p>}
                    </div>
                  </div>
                )}

                {/* Engagement Stats */}
                <div className="flex gap-4 mt-4 text-sm text-muted-foreground">
                  <span>{post.likes?.length || 0} likes</span>
                  <span>{post.comments?.length || 0} comments</span>
                  {post.type === 'recipe' && <span>{post.ratings?.length || 0} ratings</span>}
                </div>
              </div>

              {/* Comments & Ratings */}
              {(post.comments?.length > 0 || post.ratings?.length > 0) && (
                <div className="border-b border-border">
                  <button
                    onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {expandedPost === post.id ? 'Hide' : 'Show'} Comments & Ratings
                    </span>
                    <Eye className={`h-4 w-4 transition-transform ${expandedPost === post.id ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {expandedPost === post.id && (
                    <div className="p-6 space-y-4">
                      {/* Comments */}
                      {post.comments?.length > 0 && (
                        <div>
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Comments ({post.comments.length})
                          </h4>
                          <div className="space-y-3">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className={`bg-secondary/50 rounded-lg p-4 ${comment.hidden ? 'opacity-50' : ''}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground text-sm">{comment.user_name}</span>
                                    {comment.hidden && (
                                      <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
                                        Hidden
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                                </div>
                                
                                {editingComment?.commentId === comment.id ? (
                                  <div className="space-y-2">
                                    <textarea
                                      value={editingComment.content}
                                      onChange={(e) => setEditingComment({ ...editingComment, content: e.target.value })}
                                      className="input-clean w-full px-3 py-2 min-h-[60px]"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={saveEditedComment}
                                        className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingComment(null)}
                                        className="text-xs px-3 py-1.5 bg-secondary text-foreground rounded hover:bg-secondary/80"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm text-foreground mb-2">{comment.content}</p>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setEditingComment({ postId: post.id, commentId: comment.id, content: comment.content })}
                                        className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 flex items-center gap-1"
                                      >
                                        <Edit3 className="h-3 w-3" />
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => toggleCommentVisibility(post.id, comment.id, comment.hidden || false)}
                                        className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded hover:bg-orange-200 dark:hover:bg-orange-900/30 flex items-center gap-1"
                                      >
                                        {comment.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                        {comment.hidden ? 'Show' : 'Hide'}
                                      </button>
                                      <button
                                        onClick={() => deleteComment(post.id, comment.id)}
                                        className="text-xs px-2 py-1 bg-destructive/10 text-destructive rounded hover:bg-destructive/20 flex items-center gap-1"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ratings */}
                      {post.ratings && post.ratings.length > 0 && (
                        <div>
                          <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            Ratings ({post.ratings.length})
                          </h4>
                          <div className="space-y-2">
                            {post.ratings.map((rating, idx) => (
                              <div key={idx} className="bg-secondary/50 rounded-lg p-3 flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-foreground text-sm">{rating.user_name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{formatDate(rating.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`h-4 w-4 ${i < rating.rating ? 'fill-accent text-accent' : 'text-muted-foreground'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="p-6 flex gap-3 flex-wrap">
                <button
                  onClick={() => setWarningModal({ postId: post.id, userId: post.author_id, userName: post.author_name })}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-all duration-200 border border-orange-200 dark:border-orange-800"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Issue Warning
                </button>
                <button
                  onClick={() => deletePost(post.id, post.author_name)}
                  disabled={deletingPost === post.id}
                  className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-all duration-200 border border-destructive/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingPost === post.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Post
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Warning Modal */}
      {warningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="post-card max-w-lg w-full">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Issue Warning
              </h3>
              <button
                onClick={() => {
                  setWarningModal(null)
                  setWarningReason('')
                }}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-foreground mb-4">
                Issue a warning to <span className="font-medium">{warningModal.userName}</span> for violating community guidelines.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  ℹ️ An email notification will be sent to the user with the warning details and post link.
                </p>
              </div>
              <div className="mb-4">
                <label className="block text-foreground text-sm font-medium mb-2">
                  Reason for Warning *
                </label>
                <textarea
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  className="input-clean w-full px-4 py-3 min-h-[100px]"
                  placeholder="Describe the violation..."
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setWarningModal(null)
                    setWarningReason('')
                  }}
                  className="flex-1 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={issueWarning}
                  disabled={issuingWarning || !warningReason.trim()}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {issuingWarning ? 'Issuing...' : 'Issue Warning & Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning History Modal */}
      {showWarningsHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="post-card max-w-4xl w-full my-8">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <History className="h-5 w-5 text-orange-600" />
                Warning History ({warningsHistory.length})
              </h3>
              <button
                onClick={() => setShowWarningsHistory(false)}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6">
              {warningsHistory.length === 0 ? (
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No warnings issued yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {warningsHistory.map((warning) => (
                    <div key={warning.id} className="bg-secondary/50 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={() => onNavigate('account', warning.user_id)}
                              className="font-medium text-foreground hover:text-primary transition-colors"
                            >
                              {warning.user_name}
                            </button>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              warning.status === 'active'
                                ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                                : warning.status === 'appealed'
                                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                            }`}>
                              {warning.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Issued by {warning.issued_by} • {formatDate(warning.issued_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-background/50 rounded p-3 mb-2">
                        <p className="text-sm font-medium text-foreground mb-1">Reason:</p>
                        <p className="text-sm text-foreground">{warning.reason}</p>
                      </div>
                      
                      {warning.post_id && (
                        <p className="text-xs text-muted-foreground mb-2">
                          Related to Post ID: {warning.post_id}
                        </p>
                      )}
                      
                      {warning.appeal_message && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 mt-2">
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                            Appeal Message:
                          </p>
                          <p className="text-sm text-blue-600 dark:text-blue-300">
                            {warning.appeal_message}
                          </p>
                        </div>
                      )}
                      
                      {warning.status === 'appealed' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              // TODO: Implement approve appeal
                              toast.success('Appeal approved')
                            }}
                            className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/30"
                          >
                            Approve Appeal
                          </button>
                          <button
                            onClick={() => {
                              // TODO: Implement reject appeal
                              toast.success('Appeal rejected')
                            }}
                            className="text-xs px-3 py-1.5 bg-destructive/10 text-destructive rounded hover:bg-destructive/20"
                          >
                            Reject Appeal
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">
                  Auto-Suspension Policy
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Users will be automatically suspended after receiving 3 active warnings. 
                  Banned users will have received 5 or more warnings.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}