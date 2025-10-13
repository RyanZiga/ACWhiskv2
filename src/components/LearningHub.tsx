import React, { useState, useEffect } from 'react'
import { BookOpen, Play, Download, Filter, Search, Star, Plus, X } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface Resource {
  id: string
  title: string
  description: string
  type: 'video' | 'article' | 'pdf' | 'link'
  category: string
  author_id: string
  author_name: string
  created_at: string
  url?: string
}

interface LearningHubProps {
  user: User
  onNavigate: (page: string) => void
}

export function LearningHub({ user, onNavigate }: LearningHubProps) {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [showCreateResource, setShowCreateResource] = useState(false)

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'basics', label: 'Cooking Basics' },
    { id: 'techniques', label: 'Techniques' },
    { id: 'ingredients', label: 'Ingredients' },
    { id: 'equipment', label: 'Equipment' },
    { id: 'nutrition', label: 'Nutrition' },
    { id: 'safety', label: 'Food Safety' }
  ]

  const resourceTypes = [
    { id: 'all', label: 'All Types' },
    { id: 'video', label: 'Videos' },
    { id: 'article', label: 'Articles' },
    { id: 'pdf', label: 'PDFs' },
    { id: 'link', label: 'Links' }
  ]

  useEffect(() => {
    loadResources()
  }, [])

  const loadResources = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/resources`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { resources } = await response.json()
        setResources(resources.sort((a: Resource, b: Resource) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ))
      }
    } catch (error) {
      console.error('Error loading resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory
    const matchesType = selectedType === 'all' || resource.type === selectedType
    return matchesSearch && matchesCategory && matchesType
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Play
      case 'article': return BookOpen
      case 'pdf': return Download
      case 'link': return BookOpen
      default: return BookOpen
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
      case 'article': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
      case 'pdf': return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
      case 'link': return 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading resources...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-foreground mb-2">Learning Hub</h1>
            <p className="text-muted-foreground">Discover curated learning materials and culinary resources</p>
          </div>
          
          {user.role === 'instructor' && (
            <button
              onClick={() => setShowCreateResource(true)}
              className="flex items-center space-x-2 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>Add Resource</span>
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              />
            </div>
            
            <div className="flex gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              >
                {resourceTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => {
            const TypeIcon = getTypeIcon(resource.type)
            return (
              <div
                key={resource.id}
                className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(resource.type)}`}>
                    <TypeIcon className="h-3 w-3 mr-1" />
                    {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                  </span>
                </div>

                <h3 className="font-semibold text-card-foreground mb-2">{resource.title}</h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-3">{resource.description}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>By {resource.author_name}</span>
                  <span>{formatDate(resource.created_at)}</span>
                </div>

                <button
                  onClick={() => resource.url && window.open(resource.url, '_blank')}
                  className="w-full px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  View Resource
                </button>
              </div>
            )
          })}
        </div>

        {filteredResources.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-card-foreground mb-2">
              {searchTerm || selectedCategory !== 'all' || selectedType !== 'all' 
                ? 'No resources found' 
                : 'No resources available yet'
              }
            </h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedCategory !== 'all' || selectedType !== 'all'
                ? 'Try adjusting your search or filter settings'
                : 'Check back later for new learning materials'
              }
            </p>
          </div>
        )}

        {/* Create Resource Modal */}
        {showCreateResource && (
          <CreateResourceModal
            user={user}
            categories={categories.filter(c => c.id !== 'all')}
            resourceTypes={resourceTypes.filter(t => t.id !== 'all')}
            onClose={() => setShowCreateResource(false)}
            onSuccess={() => {
              setShowCreateResource(false)
              loadResources()
            }}
          />
        )}
      </div>
    </div>
  )
}

interface CreateResourceModalProps {
  user: User
  categories: Array<{ id: string; label: string }>
  resourceTypes: Array<{ id: string; label: string }>
  onClose: () => void
  onSuccess: () => void
}

function CreateResourceModal({ user, categories, resourceTypes, onClose, onSuccess }: CreateResourceModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'article',
    category: 'basics',
    url: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/resources`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess()
      } else {
        const { error } = await response.json()
        setError(error || 'Failed to create resource')
      }
    } catch (err) {
      console.error('Resource creation error:', err)
      setError('An error occurred while creating the resource')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-card border border-border rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-card-foreground">Add New Resource</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              placeholder="Enter resource title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              placeholder="Describe the resource..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              >
                {resourceTypes.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              URL *
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent text-foreground"
              placeholder="https://example.com/resource"
            />
          </div>

          {error && (
            <div className="text-destructive text-sm bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 btn-gradient rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}