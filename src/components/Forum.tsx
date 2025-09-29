import React, { useState, useEffect } from 'react'
import { Plus, MessageSquare, Users, Clock, Search, Filter } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface ForumPost {
  id: string
  title: string
  content: string
  category: string
  author_id: string
  author_name: string
  author_role: string
  created_at: string
  replies: any[]
}

interface ForumProps {
  user: User
  onNavigate: (page: string, id?: string) => void
}

export function Forum({ user, onNavigate }: ForumProps) {
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', label: 'All Posts', icon: MessageSquare },
    { id: 'recipes', label: 'Recipe Help', icon: MessageSquare },
    { id: 'techniques', label: 'Techniques', icon: MessageSquare },
    { id: 'equipment', label: 'Equipment', icon: MessageSquare },
    { id: 'general', label: 'General Discussion', icon: MessageSquare },
    { id: 'tips', label: 'Tips & Tricks', icon: MessageSquare },
    { id: 'help', label: 'Help & Support', icon: MessageSquare }
  ]

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/rest/v1/forum_posts?select=*,replies(*)`, {
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      }
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-gradient">
        <div className="px-6 py-8 max-w-7xl mx-auto">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading forum...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-gradient">
      <div className="px-6 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Community Forum</h1>
            <p className="text-muted-foreground">Connect, discuss, and learn with fellow culinary enthusiasts</p>
          </div>
          
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center space-x-2 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Post</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(category => {
            const Icon = category.icon
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? 'btn-gradient'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{category.label}</span>
              </button>
            )
          })}
        </div>

        {/* Forum Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <MessageSquare className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <p className="text-2xl font-bold text-card-foreground">{posts.length}</p>
            <p className="text-muted-foreground text-sm">Total Posts</p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <Clock className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <p className="text-2xl font-bold text-card-foreground">
              {posts.filter(post => {
                const postDate = new Date(post.created_at)
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                return postDate >= today
              }).length}
            </p>
            <p className="text-muted-foreground text-sm">Active Today</p>
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <Users className="h-8 w-8 text-purple-600 mx-auto mb-3" />
            <p className="text-2xl font-bold text-card-foreground">
              {new Set(posts.map(p => p.author_id)).size}
            </p>
            <p className="text-muted-foreground text-sm">Contributors</p>
          </div>
        </div>

        {/* Forum Posts */}
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => onNavigate('post', post.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-card-foreground mb-2 hover:text-primary transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-muted-foreground line-clamp-2 mb-3">
                    {post.content}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-card-foreground">{post.author_name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(post.author_role)}`}>
                        {post.author_role}
                      </span>
                    </div>
                    
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{formatDate(post.created_at)}</span>
                    
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground capitalize">
                      {categories.find(c => c.id === post.category)?.label || post.category}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-muted-foreground ml-4">
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="h-4 w-4" />
                    <span>{post.replies.length}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <MessageSquare className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-card-foreground mb-2">
                No posts yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Be the first to start a discussion in this category!
              </p>
              <button
                onClick={() => setShowCreatePost(true)}
                className="px-6 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create First Post
              </button>
            </div>
          )}
        </div>

        {/* Create Post Modal */}
        {showCreatePost && (
          <CreatePostModal
            user={user}
            categories={categories.filter(c => c.id !== 'all')}
            onClose={() => setShowCreatePost(false)}
            onSuccess={() => {
              setShowCreatePost(false)
              loadPosts()
            }}
          />
        )}
      </div>
    </div>
  )
}

interface CreatePostModalProps {
  user: User
  categories: Array<{ id: string; label: string }>
  onClose: () => void
  onSuccess: () => void
}

function CreatePostModal({ user, categories, onClose, onSuccess }: CreatePostModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: categories[0]?.id || ''
  })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/rest/v1/forum_posts`, {
        method: 'POST',
        headers: {
          'apikey': publicAnonKey,
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          category: formData.category,
          author_id: user.id,
          author_name: user.name,
          author_role: user.role,
          created_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        onSuccess()
      }
    } catch (error) {
      console.error('Failed to create post:', error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-card-foreground">Create New Post</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
              placeholder="What's your topic?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Content
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              rows={8}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
              placeholder="Share your thoughts, questions, or insights..."
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}