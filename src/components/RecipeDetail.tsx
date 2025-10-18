import React, { useState, useEffect } from 'react'
import { ArrowLeft, Clock, Users, Star, Heart, Share2, ChefHat } from 'lucide-react'
import { projectId, publicAnonKey } from '../utils/supabase/info'
import { ImageWithFallback } from './figma/ImageWithFallback'

interface User {
  id: string
  name: string
  role: 'student' | 'instructor' | 'admin'
  access_token?: string
}

interface Recipe {
  id: string
  title: string
  description: string
  ingredients: string[]
  instructions: string[]
  prep_time: string
  cook_time: string
  servings: string
  difficulty: string
  category: string
  author_id: string
  author_name: string
  created_at: string
  ratings: any[]
  image_url?: string
}

interface RecipeDetailProps {
  recipeId: string
  user: User
  onNavigate: (page: string) => void
}

export function RecipeDetail({ recipeId, user, onNavigate }: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRatingForm, setShowRatingForm] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [userComment, setUserComment] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  useEffect(() => {
    loadRecipe()
  }, [recipeId])

  const loadRecipe = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/recipes/${recipeId}`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { recipe } = await response.json()
        setRecipe(recipe)
        

        const existingRating = recipe.ratings.find((r: any) => r.user_id === user.id)
        if (existingRating) {
          setUserRating(existingRating.rating)
          setUserComment(existingRating.comment || '')
        }
      }
    } catch (error) {
      console.error('Error loading recipe:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAverageRating = () => {
    if (!recipe || recipe.ratings.length === 0) return 0
    const sum = recipe.ratings.reduce((acc, rating) => acc + rating.rating, 0)
    return sum / recipe.ratings.length
  }

  const submitRating = async () => {
    if (!userRating || submittingRating) return

    setSubmittingRating(true)
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/recipes/${recipeId}/rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating: userRating,
          comment: userComment.trim()
        })
      })

      if (response.ok) {
        const { recipe: updatedRecipe } = await response.json()
        setRecipe(updatedRecipe)
        setShowRatingForm(false)
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
    } finally {
      setSubmittingRating(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100'
      case 'intermediate': return 'text-yellow-600 bg-yellow-100'
      case 'advanced': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading recipe...</p>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Recipe not found</h2>
          <p className="text-gray-600 mb-4">The recipe you're looking for doesn't exist.</p>
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-500 hover:text-red-500 hover:bg-gray-100 rounded-full transition-colors">
            <Heart className="h-5 w-5" />
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </div>


      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        {recipe.image_url && (
          <div className="h-64 md:h-80 relative">
            <ImageWithFallback
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.title}</h1>
              <p className="text-gray-600 mb-4">{recipe.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>By {recipe.author_name}</span>
                <span>•</span>
                <span>{formatDate(recipe.created_at)}</span>
                <span>•</span>
                <span className="capitalize">{recipe.category.replace('-', ' ')}</span>
              </div>
            </div>

            <div className="flex flex-col items-end space-y-2">
              <div className="flex items-center space-x-1">
                <Star className="h-5 w-5 text-yellow-500" />
                <span className="font-semibold">{getAverageRating().toFixed(1)}</span>
                <span className="text-gray-500">({recipe.ratings.length} reviews)</span>
              </div>
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getDifficultyColor(recipe.difficulty)}`}>
                {recipe.difficulty}
              </span>
            </div>
          </div>


          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            {recipe.prep_time && (
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Prep Time</p>
                  <p className="text-sm text-gray-600">{recipe.prep_time} min</p>
                </div>
              </div>
            )}

            {recipe.cook_time && (
              <div className="flex items-center space-x-2">
                <ChefHat className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Cook Time</p>
                  <p className="text-sm text-gray-600">{recipe.cook_time} min</p>
                </div>
              </div>
            )}

            {recipe.servings && (
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Servings</p>
                  <p className="text-sm text-gray-600">{recipe.servings}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ingredients</h2>
            <ul className="space-y-3">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-700">{ingredient}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>


        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, index) => (
                <li key={index} className="flex space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <p className="text-gray-700 pt-1">{instruction}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>


      <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Reviews & Ratings</h2>
          {recipe.author_id !== user.id && (
            <button
              onClick={() => setShowRatingForm(!showRatingForm)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              {recipe.ratings.find(r => r.user_id === user.id) ? 'Update Review' : 'Write Review'}
            </button>
          )}
        </div>


        {showRatingForm && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Rating
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setUserRating(star)}
                    className={`h-8 w-8 ${star <= userRating ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500 transition-colors`}
                  >
                    <Star className="h-full w-full fill-current" />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (optional)
              </label>
              <textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Share your thoughts about this recipe..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={submitRating}
                disabled={!userRating || submittingRating}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {submittingRating ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                onClick={() => setShowRatingForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}


        <div className="space-y-4">
          {recipe.ratings.map((rating, index) => (
            <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{rating.user_name}</span>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${star <= rating.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  {rating.comment && (
                    <p className="text-gray-700">{rating.comment}</p>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(rating.created_at)}
                </span>
              </div>
            </div>
          ))}

          {recipe.ratings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Star className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No reviews yet. Be the first to review this recipe!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}