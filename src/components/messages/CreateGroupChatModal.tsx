import React, { useState, useEffect } from 'react'
import { X, Search, Users, Loader2, Check } from 'lucide-react'
import { User } from '../../utils/auth'
import { projectId } from '../../utils/supabase/info'

interface CreateGroupChatModalProps {
  user: User
  onClose: () => void
  onGroupCreated: (conversationId: string) => void
}

interface UserProfile {
  id: string
  name: string
  avatar_url?: string
  role: string
}

export function CreateGroupChatModal({ user, onClose, onGroupCreated }: CreateGroupChatModalProps) {
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [allUsers, setAllUsers] = useState<UserProfile[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setSearchLoading(true)
      
      // Load students only from KV store via edge function
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/all`,
        {
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const { users } = await response.json()
      
      // Filter to only show students
      const students = users.filter((u: UserProfile) => u.role === 'student')
      
      setAllUsers(students || [])
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Failed to load users')
    } finally {
      setSearchLoading(false)
    }
  }

  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    u.id !== user.id
  )

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const removeUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(id => id !== userId))
  }

  const getSelectedUserDetails = () => {
    return selectedUsers
      .map(id => allUsers.find(u => u.id === id))
      .filter(Boolean) as UserProfile[]
  }

  const showDropdown = isSearchFocused || searchQuery.length > 0

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name')
      return
    }

    if (selectedUsers.length === 0) {
      setError('Please select at least one student')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/group-chats`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: groupName.trim(),
            description: groupDescription.trim() || null,
            participant_ids: selectedUsers
          })
        }
      )

      if (response.ok) {
        const { conversation_id } = await response.json()
        onGroupCreated(conversation_id)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create group chat')
      }
    } catch (error) {
      console.error('Error creating group:', error)
      setError('Failed to create group chat')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Create Group Chat</h2>
              <p className="text-sm text-muted-foreground">Add students to your group</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Group Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Group Name *
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Culinary Arts 101"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description (Optional)
              </label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="What's this group about?"
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
                maxLength={500}
              />
            </div>
          </div>

          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Add Students ({selectedUsers.length} selected)
            </label>

            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {getSelectedUserDetails().map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm"
                  >
                    <span className="font-medium">{student.name}</span>
                    <button
                      onClick={() => removeUser(student.id)}
                      className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                placeholder="Search students..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* User List Dropdown */}
            {showDropdown && (
              <div className="border border-border rounded-lg overflow-hidden">
              {searchLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading students...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? 'No students found' : 'No students available'}
                  </p>
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  {filteredUsers.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => toggleUserSelection(student.id)}
                      className={`w-full p-4 flex items-center gap-3 hover:bg-accent transition-colors ${
                        selectedUsers.includes(student.id) ? 'bg-accent' : ''
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white flex-shrink-0">
                        {student.name[0]?.toUpperCase() || '?'}
                      </div>

                      {/* Name */}
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{student.role}</p>
                      </div>

                      {/* Checkbox */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedUsers.includes(student.id)
                          ? 'bg-primary border-primary'
                          : 'border-border'
                      }`}>
                        {selectedUsers.includes(student.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroup}
            disabled={loading || !groupName.trim() || selectedUsers.length === 0}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" />
                Create Group
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
