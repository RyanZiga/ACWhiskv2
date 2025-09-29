import React, { useState, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Share,
  Plus,
  Camera,
  MoreHorizontal,
  Edit,
  Trash2,
  Send,
  Clock,
  Star,
  Users,
  ChefHat,
  Utensils,
  Award,
  TrendingUp,
  Sparkles,
  Menu,
  X,
  Trophy,
  Lightbulb,
} from "lucide-react";
import { projectId } from "../utils/supabase/info";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface User {
  id: string;
  name: string;
  role: "student" | "instructor" | "admin";
  access_token?: string;
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  created_at: string;
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
  type?: "recipe" | "post";
  recipe_data?: {
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    cooking_time: number;
    servings: number;
    rating: number;
    tags: string[];
  };
}

interface Recipe {
  id: string;
  title: string;
  author_name: string;
  rating: number;
  reviews_count: number;
  created_at: string;
  difficulty: string;
  cooking_time: number;
  image?: string;
}



interface FeedProps {
  user: User;
  onNavigate: (page: string, id?: string) => void;
}

const cookingTips = [
  {
    title: "Perfect Pasta Every Time",
    tip: "Salt your pasta water generously - it should taste like the sea! This is your only chance to season the pasta itself.",
    category: "Pasta",
    icon: "🍝",
  },
  {
    title: "Knife Care Essential",
    tip: "Always cut on a wooden or plastic cutting board. Glass and stone boards will dull your knives quickly.",
    category: "Technique",
    icon: "🔪",
  },
  {
    title: "Garlic Secret",
    tip: "Remove the green germ from garlic cloves to prevent bitterness, especially in raw preparations.",
    category: "Ingredients",
    icon: "🧄",
  },
  {
    title: "Meat Resting Rule",
    tip: "Let meat rest for 5-10 minutes after cooking. This allows juices to redistribute for maximum tenderness.",
    category: "Cooking",
    icon: "🥩",
  },
  {
    title: "Oil Temperature Test",
    tip: "Drop a small piece of bread in oil - if it sizzles immediately, your oil is ready for frying.",
    category: "Frying",
    icon: "🍞",
  },
  {
    title: "Fresh Herb Storage",
    tip: "Store fresh herbs like flowers in water, cover with plastic bag, and refrigerate for longer life.",
    category: "Storage",
    icon: "��",
  },
  {
    title: "Tomato Ripening",
    tip: "Store tomatoes stem-side down to prevent moisture loss and extend freshness.",
    category: "Storage",
    icon: "🍅",
  },
  {
    title: "Onion Tears Prevention",
    tip: "Chill onions for 30 minutes before cutting, or cut them under running water to reduce tears.",
    category: "Technique",
    icon: "🧅",
  },
  {
    title: "Baking Precision",
    tip: "Weigh your ingredients instead of using volume measurements for more consistent baking results.",
    category: "Baking",
    icon: "⚖️",
  },
  {
    title: "Cast Iron Care",
    tip: "Clean cast iron while still warm and dry immediately. A light coating of oil prevents rust.",
    category: "Equipment",
    icon: "🍳",
  },
];

export function Feed({ user, onNavigate }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [topRecipes, setTopRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(
    null,
  );
  const [editContent, setEditContent] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<
    string | null
  >(null);
  const [commentText, setCommentText] = useState<{
    [key: string]: string;
  }>({});
  const [showMobileSidebar, setShowMobileSidebar] =
    useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
    loadTopRecipes();

    // Real-time updates every 30 seconds
    const feedInterval = setInterval(() => {
      loadFeed();
    }, 30000);

    // Update top recipes every 5 minutes
    const recipesInterval = setInterval(() => {
      loadTopRecipes();
    }, 300000);

    // Handle scroll for blur header
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };

    // Close dropdowns when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]') && !target.closest('[data-dropdown-trigger]')) {
        setActiveDropdown(null);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleClickOutside);

    // Change cooking tip every minute
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % cookingTips.length);
    }, 60000);

    return () => {
      clearInterval(feedInterval);
      clearInterval(recipesInterval);
      clearInterval(tipInterval);
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const loadFeed = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/feed`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const { posts: feedPosts } = await response.json();
        setPosts(feedPosts);
      } else {
        // Fallback to demo data with real-time simulation
        generateDemoPosts();
      }
    } catch (error) {
      console.error("Error loading feed:", error);
      generateDemoPosts();
    } finally {
      setLoading(false);
    }
  };

  const loadTopRecipes = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/recipes/top-rated`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const { recipes } = await response.json();
        setTopRecipes(recipes.slice(0, 5));
      } else {
        // Generate realistic top recipes
        generateTopRecipes();
      }
    } catch (error) {
      console.error("Error loading top recipes:", error);
      generateTopRecipes();
    }
  };



  const generateDemoPosts = () => {
    const demoPosts: Post[] = [
      {
        id: `post_${Date.now()}_1`,
        content:
          "Just perfected my grandmother's risotto recipe! The secret is patience and constant stirring. Added some wild mushrooms and fresh herbs for an amazing depth of flavor. 🍄✨",
        images: [
          "https://images.unsplash.com/photo-1676300185292-b8bb140fb5b1?w=800",
        ],
        author_id: "sarah_123",
        author_name: "Sarah Chen",
        author_role: "instructor",
        created_at: new Date(
          Date.now() - Math.random() * 1000 * 60 * 60 * 2,
        ).toISOString(),
        likes: ["user1", "user2", "user3", user.id],
        comments: [
          {
            id: "c1",
            content:
              "This looks absolutely incredible! Could you share the full recipe?",
            author_id: "user1",
            author_name: "Maria Garcia",
            created_at: new Date(
              Date.now() - 1000 * 60 * 30,
            ).toISOString(),
          },
        ],
        type: "recipe",
        recipe_data: {
          title: "Wild Mushroom Risotto",
          difficulty: "Medium",
          cooking_time: 45,
          servings: 4,
          rating: 4.8,
          tags: [
            "risotto",
            "mushroom",
            "italian",
            "comfort-food",
          ],
        },
      },
      {
        id: `post_${Date.now()}_2`,
        content:
          "Experimenting with Mediterranean flavors today! This quinoa bowl is packed with roasted vegetables, feta, and my homemade lemon tahini dressing. Perfect for meal prep! 🥗",
        images: [
          "https://images.unsplash.com/photo-1665088127661-83aeff6104c4?w=800",
        ],
        author_id: "marco_456",
        author_name: "Marco Antonio",
        author_role: "student",
        created_at: new Date(
          Date.now() - Math.random() * 1000 * 60 * 60 * 4,
        ).toISOString(),
        likes: ["user1", "user4", "user5"],
        comments: [],
        type: "recipe",
        recipe_data: {
          title: "Mediterranean Quinoa Bowl",
          difficulty: "Easy",
          cooking_time: 25,
          servings: 2,
          rating: 4.6,
          tags: [
            "healthy",
            "mediterranean",
            "quinoa",
            "vegetarian",
          ],
        },
      },
    ];
    setPosts(demoPosts);
  };

  const generateTopRecipes = () => {
    const topRecipes: Recipe[] = [
      {
        id: "recipe_1",
        title: "Truffle Mushroom Pasta",
        author_name: "Chef Marie Laurent",
        rating: 4.9,
        reviews_count: 234,
        created_at: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 2,
        ).toISOString(),
        difficulty: "Medium",
        cooking_time: 30,
        image:
          "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=300",
      },
      {
        id: "recipe_2",
        title: "Perfect Beef Wellington",
        author_name: "Gordon Stevens",
        rating: 4.8,
        reviews_count: 189,
        created_at: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 1,
        ).toISOString(),
        difficulty: "Hard",
        cooking_time: 120,
        image:
          "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300",
      },
      {
        id: "recipe_3",
        title: "Classic Crème Brûlée",
        author_name: "Pastry Chef Anna",
        rating: 4.8,
        reviews_count: 156,
        created_at: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 3,
        ).toISOString(),
        difficulty: "Medium",
        cooking_time: 45,
        image:
          "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=300",
      },
      {
        id: "recipe_4",
        title: "Authentic Ramen Bowl",
        author_name: "Chef Tanaka",
        rating: 4.7,
        reviews_count: 298,
        created_at: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 1,
        ).toISOString(),
        difficulty: "Hard",
        cooking_time: 180,
        image:
          "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300",
      },
      {
        id: "recipe_5",
        title: "Artisan Sourdough Bread",
        author_name: "Baker Jane",
        rating: 4.7,
        reviews_count: 445,
        created_at: new Date(
          Date.now() - 1000 * 60 * 60 * 24 * 2,
        ).toISOString(),
        difficulty: "Hard",
        cooking_time: 240,
        image:
          "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300",
      },
    ];
    setTopRecipes(topRecipes);
  };



  const handleLike = async (postId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/posts/${postId}/like`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const { post } = await response.json();
        setPosts((prevPosts) =>
          prevPosts.map((p) => (p.id === postId ? post : p)),
        );
      }
    } catch (error) {
      console.error("Error liking post:", error);
      // Optimistic update for demo
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const isLiked = post.likes.includes(user.id);
            return {
              ...post,
              likes: isLiked
                ? post.likes.filter((id) => id !== user.id)
                : [...post.likes, user.id],
            };
          }
          return post;
        }),
      );
    }
  };

  const handleComment = async (postId: string) => {
    const content = commentText[postId]?.trim();
    if (!content) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/posts/${postId}/comment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content }),
        },
      );

      if (response.ok) {
        const { post } = await response.json();
        setPosts((prevPosts) =>
          prevPosts.map((p) => (p.id === postId ? post : p)),
        );
      }
    } catch (error) {
      console.error("Error commenting on post:", error);
      // Optimistic update for demo
      const newComment: Comment = {
        id: `comment_${Date.now()}`,
        content,
        author_id: user.id,
        author_name: user.name,
        created_at: new Date().toISOString(),
      };

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [...post.comments, newComment],
              }
            : post,
        ),
      );
    }

    setCommentText((prev) => ({ ...prev, [postId]: "" }));
  };

  const handleEditPost = async (content: string) => {
    if (!editingPost || !content.trim()) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/posts/${editingPost.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: content.trim() }),
        },
      );

      if (response.ok) {
        const { post } = await response.json();
        setPosts((prevPosts) =>
          prevPosts.map((p) => (p.id === editingPost.id ? post : p)),
        );
        setEditingPost(null);
        setEditContent("");
      }
    } catch (error) {
      console.error("Error editing post:", error);
      // Optimistic update for demo
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === editingPost.id
            ? { ...post, content: content.trim() }
            : post,
        ),
      );
      setEditingPost(null);
      setEditContent("");
    }
  };

  const handleDeletePost = async (postId: string) => {
    setActiveDropdown(null); // Close any open dropdowns
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/posts/${postId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        },
      );

      if (response.ok) {
        setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      console.error("Error deleting post:", error);
      // Optimistic update for demo
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
      setShowDeleteConfirm(null);
    }
  };



  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours =
      (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      case "Hard":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "instructor":
        return "bg-blue-100 text-blue-700";
      case "admin":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-gradient">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-gray-600">
              Loading feed...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-gradient">
      {/* Sticky Blur Header for Mobile */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 transition-all duration-300 ${
          scrolled
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        } lg:hidden`}
      >
        <div className="bg-theme-gradient/80 backdrop-blur-md border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-gray-900">Feed</h1>
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6 relative">
          {/* Main Feed */}
          <div className="flex-1 max-w-2xl lg:max-w-none lg:flex-1">
            {/* Create Post Section */}
            <div className="bg-theme-gradient rounded-2xl border border-gray-200 p-4 lg:p-6 mb-6 shadow-sm">
              <div className="flex items-center space-x-3 lg:space-x-4 mb-4">
                <div className="w-10 h-10 lg:w-12 lg:h-12 avatar-gradient rounded-full flex items-center justify-center overflow-hidden">
                  {user.avatar_url ? (
                    <ImageWithFallback
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-full h-full object-cover rounded-full"
                      fallback={
                        <span className="text-white text-sm lg:text-base font-medium">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      }
                    />
                  ) : (
                    <span className="text-white text-sm lg:text-base font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={`What's cooking, ${user.name}?`}
                  className="flex-1 px-3 lg:px-4 py-2 lg:py-3 bg-white/50 rounded-full border-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm lg:text-base text-[rgba(0,0,0,1)]"
                  onClick={() => setShowCreatePost(true)}
                  readOnly
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-2 lg:space-x-4">
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="flex items-center space-x-1 lg:space-x-2 px-3 lg:px-4 py-2 btn-gradient rounded-full transition-colors text-sm lg:text-base"
                  >
                    <Camera className="h-4 w-4 lg:h-5 lg:w-5" />
                    <span className="hidden sm:inline">
                      Photo
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => setShowCreatePost(true)}
                  className="px-4 lg:px-6 py-2 btn-gradient rounded-full transition-colors text-sm lg:text-base"
                >
                  <span className="hidden sm:inline">
                    Share
                  </span>
                  <span className="sm:hidden">Share</span>
                </button>
              </div>
            </div>

            {/* Feed Posts */}
            <div className="space-y-4 lg:space-y-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-theme-gradient rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  {/* Post Header */}
                  <div className="p-4 lg:p-6 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() =>
                            onNavigate(
                              "account",
                              post.author_id,
                            )
                          }
                          className="w-10 h-10 lg:w-12 lg:h-12 avatar-gradient rounded-full flex items-center justify-center overflow-hidden"
                        >
                          {post.author_avatar ? (
                            <ImageWithFallback
                              src={post.author_avatar}
                              alt={post.author_name}
                              className="w-full h-full object-cover rounded-full"
                              fallback={
                                <span className="text-white text-sm lg:text-base font-medium">
                                  {post.author_name
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              }
                            />
                          ) : (
                            <span className="text-white text-sm lg:text-base font-medium">
                              {post.author_name
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          )}
                        </button>

                        <div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                onNavigate(
                                  "account",
                                  post.author_id,
                                )
                              }
                              className="font-semibold text-gray-900 hover:text-purple-600 transition-colors text-sm lg:text-base"
                            >
                              {post.author_name}
                            </button>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getRoleColor(post.author_role)}`}
                            >
                              {post.author_role}
                            </span>
                          </div>
                          <p className="text-xs lg:text-sm text-gray-500">
                            {formatDate(post.created_at)}
                          </p>
                        </div>
                      </div>

                      {(post.author_id === user.id || user.role === 'admin') && (
                        <div className="relative">
                          <button 
                            data-dropdown-trigger
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === post.id ? null : post.id);
                            }}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
                          >
                            <MoreHorizontal className="h-4 w-4 lg:h-5 lg:w-5 text-gray-400" />
                          </button>
                          {activeDropdown === post.id && (
                            <div 
                              data-dropdown
                              className="absolute right-0 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg z-50 dropdown-mobile"
                            >
                              {post.author_id === user.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPost(post);
                                    setEditContent(post.content);
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 rounded-t-lg"
                                >
                                  <Edit className="h-4 w-4" />
                                  <span>Edit Post</span>
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowDeleteConfirm(post.id);
                                  setActiveDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 rounded-b-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete Post</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Post Content - Recipe or Regular Post */}
                    <div className="mb-4">
                      {post.type === "recipe" && post.recipe_data ? (
                        <>
                          <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">
                            {post.recipe_data.title}
                          </h2>
                          <p className="text-gray-700 leading-relaxed text-sm lg:text-base">
                            {post.content}
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-900 leading-relaxed text-sm lg:text-base">
                          {post.content}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Recipe Image */}
                  {post.images && post.images.length > 0 && (
                    <div className="relative">
                      <ImageWithFallback
                        src={post.images[0]}
                        alt={
                          post.recipe_data?.title ||
                          "Recipe image"
                        }
                        className="w-full h-64 lg:h-80 object-cover"
                      />

                      {/* Recipe Info Overlay */}
                      {post.type === "recipe" &&
                        post.recipe_data && (
                          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            <span
                              className={`px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium ${getDifficultyColor(post.recipe_data.difficulty)}`}
                            >
                              {post.recipe_data.difficulty}
                            </span>
                            <span className="px-2 lg:px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-800 rounded-full text-xs lg:text-sm font-medium flex items-center space-x-1">
                              <Star className="h-3 w-3 lg:h-4 lg:w-4 text-yellow-500 fill-current" />
                              <span>
                                {post.recipe_data.rating}
                              </span>
                            </span>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Recipe Stats */}
                  {post.type === "recipe" &&
                    post.recipe_data && (
                      <div className="px-4 lg:px-6 py-4 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-4 lg:space-x-6">
                            <div className="flex items-center space-x-1 lg:space-x-2 text-gray-600">
                              <Clock className="h-3 w-3 lg:h-4 lg:w-4" />
                              <span className="text-xs lg:text-sm">
                                {post.recipe_data.cooking_time}{" "}
                                min
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 lg:space-x-2 text-gray-600">
                              <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                              <span className="text-xs lg:text-sm">
                                {post.recipe_data.servings}{" "}
                                servings
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 lg:gap-2">
                          {post.recipe_data.tags
                            .slice(0, 4)
                            .map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 lg:px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs lg:text-sm hover:bg-purple-100 cursor-pointer transition-colors"
                              >
                                #{tag}
                              </span>
                            ))}
                          {post.recipe_data.tags.length > 4 && (
                            <span className="px-2 lg:px-3 py-1 bg-gray-50 text-gray-600 rounded-full text-xs lg:text-sm">
                              +
                              {post.recipe_data.tags.length - 4}{" "}
                              more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  {/* Post Actions */}
                  <div className="px-4 lg:px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 lg:space-x-6">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center space-x-1 lg:space-x-2 transition-colors ${
                            post.likes.includes(user.id)
                              ? "text-red-500"
                              : "text-gray-500 hover:text-red-500"
                          }`}
                        >
                          <Heart
                            className={`h-4 w-4 lg:h-5 lg:w-5 ${post.likes.includes(user.id) ? "fill-current" : ""}`}
                          />
                          <span className="text-sm lg:text-base font-medium">
                            {post.likes.length}
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            setShowComments(
                              showComments === post.id
                                ? null
                                : post.id,
                            )
                          }
                          className="flex items-center space-x-1 lg:space-x-2 text-gray-500 hover:text-purple-500 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4 lg:h-5 lg:w-5" />
                          <span className="text-sm lg:text-base font-medium">
                            {post.comments.length}
                          </span>
                        </button>

                        <button className="flex items-center space-x-1 lg:space-x-2 text-gray-500 hover:text-purple-500 transition-colors">
                          <Share className="h-4 w-4 lg:h-5 lg:w-5" />
                          <span className="text-sm lg:text-base font-medium hidden sm:inline">
                            67
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Comments Section */}
                    {showComments === post.id && (
                      <div className="border-t border-gray-100 pt-4 mt-4">
                        {/* Comment Input */}
                        <div className="flex items-center space-x-3 mb-4">
                          <div className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-purple-400 to-violet-500 rounded-full flex items-center justify-center overflow-hidden">
                            {user.avatar_url ? (
                              <ImageWithFallback
                                src={user.avatar_url}
                                alt={user.name}
                                className="w-full h-full object-cover rounded-full"
                                fallback={
                                  <span className="text-white text-xs lg:text-sm font-medium">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                }
                              />
                            ) : (
                              <span className="text-white text-xs lg:text-sm font-medium">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 flex space-x-2">
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentText[post.id] || ""}
                              onChange={(e) =>
                                setCommentText((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              onKeyPress={(e) =>
                                e.key === "Enter" &&
                                handleComment(post.id)
                              }
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm lg:text-base"
                            />
                            <button
                              onClick={() =>
                                handleComment(post.id)
                              }
                              disabled={
                                !commentText[post.id]?.trim()
                              }
                              className="p-2 btn-gradient rounded-full transition-colors disabled:opacity-50"
                            >
                              <Send className="h-3 w-3 lg:h-4 lg:w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-3">
                          {post.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="flex items-start space-x-3"
                            >
                              <div className="w-6 h-6 lg:w-8 lg:h-8 avatar-gradient rounded-full flex items-center justify-center">
                                <span className="text-white text-xs lg:text-sm font-medium">
                                  {comment.author_name
                                    .charAt(0)
                                    .toUpperCase()}
                                </span>
                              </div>

                              <div className="flex-1 bg-gray-50 rounded-xl px-3 lg:px-4 py-2 lg:py-3">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-xs lg:text-sm text-gray-900">
                                    {comment.author_name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDate(
                                      comment.created_at,
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs lg:text-sm text-gray-700">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-80 space-y-6 sticky top-24 h-fit">
            <SidebarContent
              topRankedRecipes={topRecipes}
              currentTip={currentTip}
              cookingTips={cookingTips}
              getDifficultyColor={getDifficultyColor}
            />
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {showMobileSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-theme-gradient z-50 overflow-y-auto lg:hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900">
                  Discover
                </h2>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-6">
              <SidebarContent
                topRankedRecipes={topRecipes}
                currentTip={currentTip}
                cookingTips={cookingTips}
                getDifficultyColor={getDifficultyColor}
              />
            </div>
          </div>
        </>
      )}

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePostModal
          user={user}
          onClose={() => setShowCreatePost(false)}
          onSuccess={() => {
            setShowCreatePost(false);
            loadFeed();
          }}
        />
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          content={editContent}
          onContentChange={setEditContent}
          onSave={handleEditPost}
          onClose={() => {
            setEditingPost(null);
            setEditContent("");
            setActiveDropdown(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          postId={showDeleteConfirm}
          onConfirm={handleDeletePost}
          onCancel={() => {
            setShowDeleteConfirm(null);
            setActiveDropdown(null);
          }}
        />
      )}
    </div>
  );
}

interface SidebarContentProps {
  topRankedRecipes: Recipe[];
  currentTip: number;
  cookingTips: any[];
  getDifficultyColor: (difficulty: string) => string;
}

function SidebarContent({
  topRankedRecipes,
  currentTip,
  cookingTips,
  getDifficultyColor,
}: SidebarContentProps) {
  return (
    <>


      {/* Live Recipe Rankings */}
      <div className="bg-theme-gradient rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <h3 className="font-bold text-gray-900">
            Live Recipe Rankings
          </h3>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </div>

        <div className="space-y-3">
          {topRankedRecipes.map((recipe, index) => (
            <div
              key={recipe.id}
              className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-lg transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : index === 1
                        ? "bg-gray-100 text-gray-700"
                        : index === 2
                          ? "bg-amber-100 text-amber-700"
                          : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {index + 1}
                </span>
                <div>
                  <h4 className="font-medium text-gray-900 text-sm">
                    {recipe.title}
                  </h4>
                  <p className="text-xs text-gray-500">
                    by {recipe.author_name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">
                    {recipe.rating}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {recipe.reviews_count} reviews
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Cooking Tips */}
      <div className="bg-theme-gradient rounded-2xl border border-purple-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Lightbulb className="h-5 w-5 text-purple-600" />
          <h3 className="font-bold text-gray-900">
            Daily Cooking Tips
          </h3>
          <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
            Live
          </span>
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 transition-all duration-500 transform">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">
              {cookingTips[currentTip].icon}
            </span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              {cookingTips[currentTip].category}
            </span>
          </div>
          <h4 className="font-medium text-gray-900 mb-2">
            {cookingTips[currentTip].title}
          </h4>
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {cookingTips[currentTip].tip}
          </p>
          <div className="flex items-center justify-between">
            <button className="text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors">
              Read More Tips →
            </button>
            <div className="flex space-x-1">
              {cookingTips.slice(0, 5).map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentTip % 5
                      ? "bg-purple-600"
                      : "bg-purple-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface CreatePostModalProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

function CreatePostModal({
  user,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    setImages((prev) => [...prev, ...files].slice(0, 4));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && images.length === 0) return;

    setLoading(true);
    setError("");

    try {
      const imageUrls: string[] = [];

      // Upload images
      for (const image of images) {
        const formData = new FormData();
        formData.append("file", image);

        const uploadResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/upload/posts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
            body: formData,
          },
        );

        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          imageUrls.push(url);
        }
      }

      // Create post
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/posts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: content.trim(),
            images: imageUrls,
          }),
        },
      );

      if (response.ok) {
        onSuccess();
      } else {
        const { error } = await response.json();
        setError(error || "Failed to create post");
      }
    } catch (err) {
      console.error("Post creation error:", err);
      // For demo, simulate success
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-gradient rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-theme-gradient border-b border-gray-200 p-4 lg:p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">
              Create Post
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl lg:text-2xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 lg:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 avatar-gradient rounded-full flex items-center justify-center overflow-hidden">
              {user.avatar_url ? (
                <ImageWithFallback
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-full"
                  fallback={
                    <span className="text-white text-sm lg:text-base font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  }
                />
              ) : (
                <span className="text-white text-sm lg:text-base font-medium">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm lg:text-base">
                {user.name}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 capitalize">
                {user.role}
              </p>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's cooking? Share your recipe or cooking experience..."
            className="w-full p-3 lg:p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm lg:text-base font-bold font-normal text-[rgba(0,0,0,1)]"
            rows={4}
          />

          {/* Image Preview */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 lg:gap-3 mt-4">
              {images.map((image, index) => (
                <div key={index} className="relative">
                  <img
                    src={URL.createObjectURL(image)}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 lg:h-32 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 lg:pt-6 border-t border-gray-200 mt-4 lg:mt-6">
            <label className="flex items-center space-x-2 px-3 lg:px-4 py-2 btn-gradient rounded-lg cursor-pointer transition-colors text-sm lg:text-base">
              <Camera className="h-4 w-4 lg:h-5 lg:w-5" />
              <span>Add Photos</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={images.length >= 4}
              />
            </label>

            <button
              type="submit"
              disabled={
                (!content.trim() && images.length === 0) ||
                loading
              }
              className="px-4 lg:px-6 py-2 btn-gradient rounded-lg transition-colors disabled:opacity-50 text-sm lg:text-base"
            >
              {loading ? "Sharing..." : "Share Post"}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

interface EditPostModalProps {
  post: Post;
  content: string;
  onContentChange: (content: string) => void;
  onSave: (content: string) => void;
  onClose: () => void;
}

function EditPostModal({ post, content, onContentChange, onSave, onClose }: EditPostModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-gradient rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-theme-gradient border-b border-gray-200 p-4 lg:p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">
              Edit Post
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl lg:text-2xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 avatar-gradient rounded-full flex items-center justify-center overflow-hidden">
              {post.author_avatar ? (
                <ImageWithFallback
                  src={post.author_avatar}
                  alt={post.author_name}
                  className="w-full h-full object-cover rounded-full"
                  fallback={
                    <span className="text-white text-sm lg:text-base font-medium">
                      {post.author_name.charAt(0).toUpperCase()}
                    </span>
                  }
                />
              ) : (
                <span className="text-white text-sm lg:text-base font-medium">
                  {post.author_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 text-sm lg:text-base">
                {post.author_name}
              </p>
              <p className="text-xs lg:text-sm text-gray-500 capitalize">
                {post.author_role}
              </p>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="What's cooking? Share your recipe or cooking experience..."
            className="w-full p-3 lg:p-4 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm lg:text-base text-gray-900"
            rows={4}
          />

          <div className="flex items-center justify-end pt-4 lg:pt-6 border-t border-gray-200 mt-4 lg:mt-6 space-x-3">
            <button
              onClick={onClose}
              className="px-4 lg:px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm lg:text-base"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(content)}
              disabled={!content.trim()}
              className="px-4 lg:px-6 py-2 btn-gradient rounded-lg transition-colors disabled:opacity-50 text-sm lg:text-base"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  postId: string;
  onConfirm: (postId: string) => void;
  onCancel: () => void;
}

function DeleteConfirmModal({ postId, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-theme-gradient rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Delete Post</h3>
              <p className="text-sm text-gray-600">This action cannot be undone.</p>
            </div>
          </div>

          <p className="text-gray-700 mb-6">
            Are you sure you want to delete this post? This will permanently remove the post and all its comments.
          </p>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(postId)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}