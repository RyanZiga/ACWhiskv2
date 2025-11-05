import React, { useState, useEffect } from 'react'
import { Users, Activity, RefreshCw, Trash2, UserPlus, X, Mail, Clock, Send, XCircle } from 'lucide-react'
import { projectId } from '../utils/supabase/info'

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

interface StudentManagementProps {
  user: User
  onNavigate: (page: string) => void
}

export function StudentManagement({ user, onNavigate }: StudentManagementProps) {
  const [students, setStudents] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    suspendedStudents: 0
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
    loadStudentData()
    loadInvitations()
  }, [])

  const loadStudentData = async () => {
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
        // Filter only students
        const studentUsers = allUsers.filter((u: User) => u.role === 'student')
        setStudents(studentUsers)
        
        const stats = {
          totalStudents: studentUsers.length,
          activeStudents: studentUsers.filter((u: User) => u.status === 'active').length,
          suspendedStudents: studentUsers.filter((u: User) => u.status === 'suspended').length
        }
        setStats(stats)
      } else {
        console.error('Failed to load student data:', response.status)
      }
    } catch (error) {
      console.error('Error loading student data:', error)
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
        // Filter only student invitations
        const studentInvitations = allInvitations.filter((inv: Invitation) => inv.role === 'student')
        setInvitations(studentInvitations || [])
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
        alert('Invitation cancelled successfully!')
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
        await loadStudentData()
        alert(`Student status updated to ${newStatus}`)
      } else {
        const error = await response.json()
        alert(`Failed to update status: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating student status:', error)
      alert('Error updating student status')
    } finally {
      setUpdatingUser(null)
    }
  }

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
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
        await loadStudentData()
        alert(`Student ${userName} deleted successfully`)
      } else {
        const error = await response.json()
        alert(`Failed to delete student: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting student:', error)
      alert('Error deleting student')
    } finally {
      setDeletingUser(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-foreground mb-2">Student Management</h1>
          <p className="text-muted-foreground">Manage student accounts and invitations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Students</p>
                <p className="text-foreground">{stats.totalStudents}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Students</p>
                <p className="text-foreground">{stats.activeStudents}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Suspended Students</p>
                <p className="text-foreground">{stats.suspendedStudents}</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <XCircle className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              setRefreshing(true)
              loadStudentData()
              loadInvitations()
            }}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="flex items-center space-x-2 px-4 py-2 btn-gradient text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Student</span>
          </button>
        </div>

        {/* Students Table */}
        <div className="bg-card border border-border rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-foreground">Students</h2>
          </div>
          
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No students found
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">{student.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.status === 'active' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                            : student.status === 'suspended'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {student.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {student.status === 'active' ? (
                            <button
                              onClick={() => updateUserStatus(student.id, 'suspended')}
                              disabled={updatingUser === student.id}
                              className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300 disabled:opacity-50"
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              onClick={() => updateUserStatus(student.id, 'active')}
                              disabled={updatingUser === student.id}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                            >
                              Activate
                            </button>
                          )}
                          <span className="text-muted-foreground">|</span>
                          <button
                            onClick={() => deleteUser(student.id, student.name)}
                            disabled={deletingUser === student.id}
                            className="text-destructive hover:text-destructive/80 disabled:opacity-50 flex items-center space-x-1"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Pending Invitations */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-foreground">Pending Student Invitations</h2>
          </div>
          
          <div className="overflow-x-auto">
            {loadingInvitations ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending invitations
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Invited By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invitations.map((invitation) => (
                    <tr key={invitation.token} className="hover:bg-muted/30">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">{invitation.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-muted-foreground">{invitation.invitedBy}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(invitation.sentAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invitation.isExpired
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {invitation.isExpired ? 'Expired' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => resendInvitation(invitation.token)}
                            disabled={resendingToken === invitation.token}
                            className="text-primary hover:text-primary/80 disabled:opacity-50 flex items-center space-x-1"
                          >
                            <Send className="h-4 w-4" />
                            <span>{resendingToken === invitation.token ? 'Sending...' : 'Resend'}</span>
                          </button>
                          <span className="text-muted-foreground">|</span>
                          <button
                            onClick={() => cancelInvitation(invitation.token, invitation.email)}
                            disabled={cancellingToken === invitation.token}
                            className="text-destructive hover:text-destructive/80 disabled:opacity-50 flex items-center space-x-1"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>{cancellingToken === invitation.token ? 'Cancelling...' : 'Cancel'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddUserModal && (
        <AddStudentModal
          user={user}
          onClose={() => setShowAddUserModal(false)}
          onSuccess={() => {
            loadStudentData()
            loadInvitations()
            setShowAddUserModal(false)
          }}
          addUserMethod={addUserMethod}
          setAddUserMethod={setAddUserMethod}
        />
      )}
    </div>
  )
}

interface AddStudentModalProps {
  user: User
  onClose: () => void
  onSuccess: () => void
  addUserMethod: 'manual' | 'invitation'
  setAddUserMethod: (method: 'manual' | 'invitation') => void
}

function AddStudentModal({ user, onClose, onSuccess, addUserMethod, setAddUserMethod }: AddStudentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (addUserMethod === 'manual') {
        // Manual registration
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/create-user`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            role: 'student'
          })
        })

        if (response.ok) {
          alert('Student created successfully!')
          onSuccess()
        } else {
          const error = await response.json()
          setError(error.error || 'Failed to create student')
        }
      } else {
        // Send invitation
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/admin/send-invitation`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: formData.email,
            role: 'student'
          })
        })

        if (response.ok) {
          alert('Invitation sent successfully!')
          onSuccess()
        } else {
          const error = await response.json()
          setError(error.error || 'Failed to send invitation')
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-foreground">Add Student</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Method Selection */}
        <div className="flex space-x-2 mb-6 bg-muted/50 p-1 rounded-lg">
          <button
            onClick={() => setAddUserMethod('manual')}
            className={`flex-1 px-4 py-2 rounded-md transition-all ${
              addUserMethod === 'manual'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Manual Registration
          </button>
          <button
            onClick={() => setAddUserMethod('invitation')}
            className={`flex-1 px-4 py-2 rounded-md transition-all ${
              addUserMethod === 'invitation'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Send Invitation
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {addUserMethod === 'manual' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              placeholder="student@asiancollege.edu.ph"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use Asian College Email
            </p>
          </div>

          {addUserMethod === 'manual' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Temporary Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Student will be required to change this password on first login
              </p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 btn-gradient text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Processing...' : addUserMethod === 'manual' ? 'Create Student' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
