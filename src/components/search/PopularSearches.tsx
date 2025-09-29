import React from 'react'

const popularTerms = [
  'pasta recipes', 'baking techniques', 'vegetarian', 'desserts', 
  'quick meals', 'italian cuisine', 'knife skills', 'sauce making',
  'healthy recipes', 'chocolate', 'asian dishes', 'grilling tips'
]

interface PopularSearchesProps {
  onSearchClick: (term: string) => void
}

export function PopularSearches({ onSearchClick }: PopularSearchesProps) {
  return (
    <div className="mt-12 bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Searches</h2>
      <div className="flex flex-wrap gap-2">
        {popularTerms.map((term) => (
          <button
            key={term}
            onClick={() => onSearchClick(term)}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
          >
            {term}
          </button>
        ))}
      </div>
    </div>
  )
}