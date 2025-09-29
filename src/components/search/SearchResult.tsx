import React from 'react'
import { Star, ChefHat, MessageSquare, BookOpen, Search } from 'lucide-react'

interface SearchResultType {
  id: string
  title: string
  description?: string
  content?: string
  author_name: string
  created_at: string
  type: 'recipe' | 'forum' | 'resource'
  ratings?: any[]
  category?: string
}

interface SearchResultProps {
  result: SearchResultType
  onClick: () => void
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'recipe': return ChefHat
    case 'forum': return MessageSquare
    case 'resource': return BookOpen
    default: return Search
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'recipe': return 'text-orange-600 bg-orange-100'
    case 'forum': return 'text-blue-600 bg-blue-100'
    case 'resource': return 'text-green-600 bg-green-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

const getAverageRating = (ratings: any[] = []) => {
  if (ratings.length === 0) return 0
  const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0)
  return sum / ratings.length
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString()
}

export function SearchResult({ result, onClick }: SearchResultProps) {
  const TypeIcon = getTypeIcon(result.type)

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(result.type)}`}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {result.type.charAt(0).toUpperCase() + result.type.slice(1)}
            </span>
            {result.category && (
              <span className="text-xs text-gray-500 capitalize">
                {result.category.replace('-', ' ')}
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-orange-600 transition-colors">
            {result.title}
          </h3>

          <p className="text-gray-600 line-clamp-2 mb-3">
            {result.description || result.content}
          </p>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>By {result.author_name}</span>
            <span>•</span>
            <span>{formatDate(result.created_at)}</span>
            {result.ratings && result.ratings.length > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>{getAverageRating(result.ratings).toFixed(1)}</span>
                  <span>({result.ratings.length} reviews)</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}