import React from 'react'
import { Search, ChefHat, MessageSquare, BookOpen } from 'lucide-react'

const searchTypes = [
  { id: 'all', label: 'All Results', icon: Search },
  { id: 'recipes', label: 'Recipes', icon: ChefHat },
  { id: 'forum', label: 'Forum Posts', icon: MessageSquare },
  { id: 'resources', label: 'Resources', icon: BookOpen }
]

interface SearchFiltersProps {
  selectedType: string
  onTypeChange: (type: string) => void
}

export function SearchFilters({ selectedType, onTypeChange }: SearchFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {searchTypes.map(type => {
        const Icon = type.icon
        return (
          <button
            key={type.id}
            onClick={() => onTypeChange(type.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedType === type.id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{type.label}</span>
          </button>
        )
      })}
    </div>
  )
}