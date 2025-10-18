import React, { useState, useEffect } from 'react'
import { Search as SearchIcon, Filter, User, ChefHat, MessageSquare, BookOpen, UserPlus, MessageCircle, Trophy } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface SearchResult {
  id: string
  title?: string
  name?: string
  content?: string
  description?: string
  type: 'recipe' | 'forum' | 'resource' | 'user'
  author_name?: string
  author_id?: string
  created_at: string
  role?: string
  bio?: string
  avatar_url?: string
  followers?: string[]
  rating?: number
}

interface SearchProps {
  user: User
  onNavigate: (page: string, id?: string) => void
}

export function Search({ user, onNavigate }: SearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState('all')
  const [topRecipes, setTopRecipes] = useState<SearchResult[]>([])

  const searchTypes = [
    { id: 'all', label: 'All', icon: SearchIcon },
    { id: 'users', label: 'People', icon: User },
    { id: 'recipes', label: 'Recipes', icon: ChefHat },
    { id: 'forum', label: 'Forum', icon: MessageSquare },
    { id: 'resources', label: 'Resources', icon: BookOpen }
  ]

  useEffect(() => {
    loadTopRecipes()
  }, [])

  useEffect(() => {
    if (query.trim()) {
      performSearch()
    } else {
      setResults([])
    }
  }, [query, selectedType])

  const loadTopRecipes = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/recipes/top-rated`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { recipes } = await response.json()
        setTopRecipes(recipes.slice(0, 5)) // Top 5 recipes
      }
    } catch (error) {
      console.error('Error loading top recipes:', error)
    }
  }

  const performSearch = async () => {
    setLoading(true)
    try {
      let searchResults: SearchResult[] = []

      if (selectedType === 'all' || selectedType === 'users') {
        const userResults = await searchUsers()
        searchResults.push(...userResults)
      }

      if (selectedType !== 'users') {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/search?q=${encodeURIComponent(query)}&type=${selectedType === 'all' ? 'all' : selectedType}`, {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const { results: otherResults } = await response.json()
          searchResults.push(...otherResults)
        }
      }

      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/search/users?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { users } = await response.json()
        return users.map((u: any) => ({ ...u, type: 'user' }))
      }
      return []
    } catch (error) {
      console.error('User search error:', error)
      return []
    }
  }

  const handleFollowUser = async (userId: string, isFollowing: boolean) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/${userId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: isFollowing ? 'unfollow' : 'follow'
        })
      })

      if (response.ok) {

        setResults(prevResults =>
          prevResults.map(result =>
            result.id === userId && result.type === 'user'
              ? {
                  ...result,
                  followers: isFollowing
                    ? result.followers?.filter(id => id !== user.id) || []
                    : [...(result.followers || []), user.id]
                }
              : result
          )
        )
      }
    } catch (error) {
      console.error('Follow error:', error)
    }
  }

  const startConversation = async (userId: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participant_id: userId
        })
      })

      if (response.ok) {
        onNavigate('messages')
      }
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'recipe': return ChefHat
      case 'forum': return MessageSquare
      case 'resource': return BookOpen
      case 'user': return User
      default: return SearchIcon
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor': return 'bg-blue-100 text-blue-700'
      case 'admin': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const calculateAverageRating = (ratings: any[]) => {
    if (!ratings || ratings.length === 0) return 0
    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0)
    return sum / ratings.length
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Search ACWhisk</h1>
        
        {/* Search Input */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for people, recipes, discussions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-clean w-full pl-10 pr-4 py-3"
          />
        </div>

        {/* Search Type Filters */}
        <div className="flex flex-wrap gap-2">
          {searchTypes.map(type => {
            const Icon = type.icon
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  selectedType === type.id
                    ? 'btn-gradient border-purple-600'
                    : 'bg-white/50 text-gray-700 border-gray-300 hover:bg-white/80'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{type.label}</span>
              </button>
            )
          })}
        </div>
      </div>


      {!query && (
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h2 className="text-xl font-bold text-gray-900">Top Rated Recipes</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topRecipes.map((recipe, index) => (
              <div
                key={recipe.id}
                className="bg-theme-gradient rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onNavigate('recipe', recipe.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg font-bold ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-amber-600' : 'text-gray-600'
                    }`}>
                      #{index + 1}
                    </span>
                    <h3 className="font-semibold text-gray-900 truncate">{recipe.title}</h3>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm font-medium text-gray-700">
                      {recipe.rating?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">By {recipe.author_name}</p>
                <p className="text-xs text-gray-500 line-clamp-2">{recipe.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}


      {query && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Search Results for "{query}"
            </h2>
            {loading && (
              <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>

          <div className="space-y-4">
            {results.map((result) => {
              const Icon = getResultIcon(result.type)
              const isUser = result.type === 'user'
              const isFollowing = isUser && result.followers?.includes(user.id)

              return (
                <div
                  key={`${result.type}-${result.id}`}
                  className="bg-theme-gradient rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {isUser ? (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center">
                          {result.avatar_url ? (
                            <ImageWithFallback
                              src={result.avatar_url}
                              alt={result.name || ''}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-medium">
                              {(result.name || '').charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Icon className="h-6 w-6 text-gray-600" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 
                            className="font-semibold text-gray-900 cursor-pointer hover:text-purple-600"
                            onClick={() => {
                              if (isUser) {
                                onNavigate('account', result.id)
                              } else if (result.type === 'recipe') {
                                onNavigate('recipe', result.id)
                              } else if (result.type === 'forum') {
                                onNavigate('post', result.id)
                              }
                            }}
                          >
                            {result.title || result.name}
                          </h3>
                          
                          {isUser && result.role && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(result.role)}`}>
                              {result.role}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {result.description || result.content || result.bio}
                        </p>
                        
                        {!isUser && result.author_name && (
                          <p className="text-xs text-gray-500">
                            By {result.author_name} • {new Date(result.created_at).toLocaleDateString()}
                          </p>
                        )}
                        
                        {isUser && result.followers && (
                          <p className="text-xs text-gray-500">
                            {result.followers.length} followers
                          </p>
                        )}
                      </div>
                    </div>

                    {isUser && result.id !== user.id && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleFollowUser(result.id, isFollowing || false)}
                          className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                            isFollowing
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                          }`}
                        >
                          <UserPlus className="h-4 w-4" />
                          <span>{isFollowing ? 'Unfollow' : 'Follow'}</span>
                        </button>
                        
                        <button
                          onClick={() => startConversation(result.id)}
                          className="flex items-center space-x-1 px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>Message</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {query && !loading && results.length === 0 && (
              <div className="text-center py-12">
                <SearchIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600">
                  Try searching with different keywords or check the spelling
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}