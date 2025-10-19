import React, { useState } from "react";
import { X, Clock, Users, ChefHat, Star, Send, MessageCircle } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { StarRating } from "./StarRating";
import { LinkifiedText } from "../utils/linkify";
import { UserRoleBadge } from "./UserRoleBadge";
import { PostImageCarousel } from "./PostImageCarousel";

interface Rating {
  user_id: string;
  user_name: string;
  rating: number;
  created_at: string;
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

interface RecipeData {
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  cooking_time: number;
  servings: number;
  rating: number;
  tags: string[];
  ingredients?: string;
  instructions?: string;
}

interface Post {
  id: string;
  content: string;
  images: string[];
  author_id: string;
  author_name: string;
  author_role: string;
  author_avatar?: string;
  created_at: string;
  likes: string[];
  comments: Comment[];
  ratings?: Rating[];
  type?: "recipe" | "post";
  recipe_data?: RecipeData;
}

interface User {
  id: string;
  name: string;
  role: "student" | "instructor" | "admin";
  avatar_url?: string;
}

interface RecipeDetailModalProps {
  post: Post;
  user: User;
  onClose: () => void;
  onRate: (rating: number) => void;
  onComment: (postId: string, content: string) => void;
  onLike: (postId: string) => void;
  onNavigate: (page: string, id?: string) => void;
}

export function RecipeDetailModal({
  post,
  user,
  onClose,
  onRate,
  onComment,
  onLike,
  onNavigate,
}: RecipeDetailModalProps) {
  if (!post.recipe_data) return null;
  
  const [commentText, setCommentText] = useState("");

  const handleComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText("");
    }
  };

  const recipe = post.recipe_data;
  const ratings = post.ratings || [];
  const averageRating = ratings.length > 0
    ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
    : 0;
  const userRating = ratings.find(r => r.user_id === user.id)?.rating || 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-500 bg-green-500/10";
      case "Medium":
        return "text-yellow-500 bg-yellow-500/10";
      case "Hard":
        return "text-red-500 bg-red-500/10";
      default:
        return "text-muted-foreground bg-secondary";
    }
  };

  const parseIngredients = (text?: string): string[] => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim());
  };

  const parseInstructions = (text?: string): string[] => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim());
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="post-card max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">

        <div className="sticky top-0 bg-card border-b border-border p-4 lg:p-6 rounded-t-lg z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Recipe Details
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {/* Recipe Image */}
          {post.images && post.images.length > 0 && (
            <div className="mb-6 rounded-lg overflow-hidden">
              <PostImageCarousel
                images={post.images}
                alt={recipe.title}
                className="h-64"
              />
            </div>
          )}


          <div className="mb-4">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {recipe.title}
            </h1>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center overflow-hidden p-0.5 cursor-pointer"
                onClick={() => onNavigate("profile", post.author_id)}
              >
                {post.author_avatar ? (
                  <ImageWithFallback
                    src={post.author_avatar}
                    alt={post.author_name}
                    className="w-full h-full object-cover rounded-full"
                    fallback={
                      <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                        <span className="text-foreground text-xs">
                          {post.author_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    }
                  />
                ) : (
                  <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                    <span className="text-foreground text-xs">
                      {post.author_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {post.author_name}
                </p>
                <UserRoleBadge role={post.author_role} size="sm" />
              </div>
            </div>
          </div>


          <div className="mb-6 p-4 bg-secondary/30 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Average Rating</p>
                <div className="flex items-center gap-2">
                  <StarRating
                    rating={averageRating}
                    size="lg"
                    showCount
                    count={ratings.length}
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {userRating > 0 ? "Your Rating" : "Rate this recipe"}
                </p>
                <StarRating
                  rating={userRating}
                  size="lg"
                  interactive
                  userRating={userRating}
                  onRate={onRate}
                />
              </div>
            </div>
          </div>


          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="text-sm font-medium text-foreground">
                {recipe.cooking_time} min
              </p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Servings</p>
              <p className="text-sm font-medium text-foreground">
                {recipe.servings}
              </p>
            </div>
            <div className="p-3 bg-secondary/30 rounded-lg text-center">
              <ChefHat className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs text-muted-foreground">Difficulty</p>
              <p
                className={`text-sm font-medium px-2 py-0.5 rounded ${getDifficultyColor(
                  recipe.difficulty
                )}`}
              >
                {recipe.difficulty}
              </p>
            </div>
          </div>


          {recipe.tags && recipe.tags.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}


          {post.content && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Description
              </h3>
              <div className="text-sm text-foreground whitespace-pre-wrap">
                <LinkifiedText text={post.content} />
              </div>
            </div>
          )}


          {recipe.ingredients && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Ingredients
              </h3>
              <ul className="space-y-2">
                {parseIngredients(recipe.ingredients).map((ingredient, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span className="text-primary mt-1">•</span>
                    <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}


          {recipe.instructions && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Instructions
              </h3>
              <ol className="space-y-3">
                {parseInstructions(recipe.instructions).map((instruction, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 text-sm text-foreground"
                  >
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}


          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Comments ({post.comments.length})
              </h3>
              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike(post.id);
                  }}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-muted-foreground">{post.likes.length} likes</span>
                </button>
              </div>
            </div>
            

            {post.comments.length > 0 ? (
              <div className="space-y-3 mb-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-white">
                        {comment.author_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-secondary/30 rounded-lg p-3">
                        <p className="text-sm font-medium text-foreground">
                          {comment.author_name}
                        </p>
                        <p className="text-sm text-foreground mt-1">
                          {comment.content}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 pl-3">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                No comments yet. Be the first to comment!
              </p>
            )}


            <div className="flex items-center gap-2">
              <div className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user.avatar_url ? (
                  <ImageWithFallback
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    fallback={
                      <span className="text-xs font-medium text-white">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    }
                  />
                ) : (
                  <span className="text-xs font-medium text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleComment()}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="p-2 text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary rounded-full transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>


          {ratings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                Recent Ratings ({ratings.length})
              </h3>
              <div className="space-y-2">
                {ratings.slice(-5).reverse().map((rating, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {rating.user_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-foreground">
                        {rating.user_name}
                      </span>
                    </div>
                    <StarRating rating={rating.rating} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
