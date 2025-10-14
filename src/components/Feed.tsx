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
  ChevronLeft,
  UserPlus,
  UserCheck,
  Video,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { projectId } from "../utils/supabase/info";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { LinkifiedText } from "../utils/linkify";
import { UserRoleBadge } from "./UserRoleBadge";
import { StoryCreator } from "./StoryCreator";
import { StoryViewer } from "./StoryViewer";

interface User {
  id: string;
  name: string;
  role: "student" | "instructor" | "admin";
  access_token?: string;
  avatar_url?: string;
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

interface StoryItem {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  type: 'image' | 'video' | 'text';
  media_url?: string;
  text_content?: string;
  background_color?: string;
  duration: number;
  created_at: string;
  viewed?: boolean;
}

interface StoryGroup {
  user_id: string;
  user_name: string;
  user_avatar: string;
  stories: StoryItem[];
  has_unviewed: boolean;
}

interface FeedProps {
  user: User;
  onNavigate: (page: string, id?: string) => void;
  unreadMessagesCount?: number;
  onCreatePostRef?: React.MutableRefObject<(() => void) | null>;
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
    icon: "🌿",
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

const postBackgroundColors = [
  "bg-gradient-to-br from-pink-200 to-pink-300",
  "bg-gradient-to-br from-blue-200 to-blue-300",
  "bg-gradient-to-br from-amber-100 to-amber-200",
  "bg-gradient-to-br from-yellow-100 to-yellow-200",
  "bg-gradient-to-br from-rose-200 to-rose-300",
  "bg-gradient-to-br from-cyan-200 to-cyan-300",
  "bg-gradient-to-br from-orange-100 to-orange-200",
  "bg-gradient-to-br from-purple-200 to-purple-300",
];

export function Feed({ user, onNavigate, unreadMessagesCount = 0, onCreatePostRef }: FeedProps) {
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
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "following" | "newest" | "popular">("all");

  // Stories state
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [userHasStory, setUserHasStory] = useState(false);



  // Expose create post function to parent
  useEffect(() => {
    if (onCreatePostRef) {
      onCreatePostRef.current = () => setShowCreatePost(true);
    }
  }, [onCreatePostRef]);

  useEffect(() => {
    loadFeed();
    loadTopRecipes();
    loadSuggestedUsers();
    loadStories();

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
      if (!user.access_token) {
        console.warn("No access token available, using demo data");
        generateDemoPosts();
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/feed`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        },
      );

      if (response.ok) {
        const { posts: feedPosts } = await response.json();
        setPosts(feedPosts || []);
      } else {
        const statusText = response.statusText || 'Unknown error';
        console.warn(`Feed API returned ${response.status}: ${statusText}. Using demo data.`);
        generateDemoPosts();
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          console.warn("Feed request timed out. Edge function may not be deployed. Using demo data.");
        } else if (error.message.includes('Failed to fetch')) {
          console.warn("Network error or Edge function not deployed. Using demo data.");
        } else {
          console.warn("Error loading feed:", error.message);
        }
      } else {
        console.warn("Unknown error loading feed. Using demo data.");
      }
      generateDemoPosts();
    } finally {
      setLoading(false);
    }
  };

  const loadTopRecipes = async () => {
    try {
      if (!user.access_token) {
        generateTopRecipes();
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/recipes/top-rated`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (response.ok) {
        const { recipes } = await response.json();
        setTopRecipes(recipes?.slice(0, 5) || []);
      } else {
        console.warn(`Recipes API returned ${response.status}. Using demo data.`);
        generateTopRecipes();
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('AbortError')) {
        console.warn("Error loading top recipes, using demo data:", error.message);
      }
      generateTopRecipes();
    }
  };

  const loadStories = async () => {
    try {
      if (!user.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/stories/list`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStoryGroups(data.story_groups || []);
        setUserHasStory(data.user_has_story || false);
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('AbortError')) {
        console.warn("Error loading stories:", error.message);
      }
    }
  };

  const handleStoryView = async (storyId: string) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/stories/${storyId}/view`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.access_token}`,
          },
        }
      );
      // Reload stories to update view status
      loadStories();
    } catch (error) {
      console.error("Error marking story as viewed:", error);
    }
  };

  const handleStoryClick = (userId: string) => {
    // Filter out users with no stories
    const groupsWithStories = storyGroups.filter(group => group.stories && group.stories.length > 0);
    
    if (groupsWithStories.length === 0) return;
    
    // Find the index of the clicked user in the filtered array
    const index = groupsWithStories.findIndex(group => group.user_id === userId);
    
    if (index === -1) return; // User not found
    
    setViewerStartIndex(index);
    setShowStoryViewer(true);
  };

  const loadSuggestedUsers = async () => {
    try {
      if (!user.access_token) return;

      // Fetch all users
      const usersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/all`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (usersResponse.ok) {
        const { users: allUsers } = await usersResponse.json();
        // Filter out current user and limit to 3 suggestions
        const suggestions = (allUsers || [])
          .filter((u: any) => u.id !== user.id)
          .slice(0, 3);
        setSuggestedUsers(suggestions);
      }

      // Fetch current user's following list
      const followingResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/${user.id}/following`,
        {
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        },
      );

      if (followingResponse.ok) {
        const { following } = await followingResponse.json();
        setFollowingUsers(new Set((following || []).map((f: any) => f.following_id)));
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('AbortError')) {
        console.warn("Error loading suggested users:", error.message);
      }
    }
  };

  const handleFollowToggle = async (targetUserId: string) => {
    const isFollowing = followingUsers.has(targetUserId);
    
    // Add to loading state
    setFollowLoading(prev => new Set([...prev, targetUserId]));

    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/${endpoint}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ target_user_id: targetUserId }),
        },
      );

      if (response.ok) {
        // Update following state
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          if (isFollowing) {
            newSet.delete(targetUserId);
          } else {
            newSet.add(targetUserId);
          }
          return newSet;
        });
      } else {
        console.error(`Failed to ${endpoint} user`);
      }
    } catch (error) {
      console.error(`Error ${isFollowing ? 'unfollowing' : 'following'} user:`, error);
    } finally {
      // Remove from loading state
      setFollowLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
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
        author_name: "Christoper Sulit",
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
        author_name: "Julias Gabas",
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
      {
        id: `post_${Date.now()}_3`,
        content:
          "Fresh homemade pasta for tonight's dinner! Nothing beats the texture and taste of handmade fettuccine 🍝",
        images: [
          "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=800",
        ],
        author_id: "chef_789",
        author_name: "Ethan Centifuxa",
        author_role: "instructor",
        created_at: new Date(
          Date.now() - Math.random() * 1000 * 60 * 60 * 6,
        ).toISOString(),
        likes: ["user2", "user3"],
        comments: [],
        type: "recipe",
        recipe_data: {
          title: "Homemade Fettuccine",
          difficulty: "Medium",
          cooking_time: 60,
          servings: 4,
          rating: 4.9,
          tags: ["pasta", "italian", "fresh", "homemade"],
        },
      },
      {
        id: `post_${Date.now()}_4`,
        content:
          "Trying out a new dessert recipe today! Chocolate lava cake with vanilla ice cream 🍫",
        images: [
          "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?w=800",
        ],
        author_id: "baker_101",
        author_name: "Julio Villarama",
        author_role: "student",
        created_at: new Date(
          Date.now() - Math.random() * 1000 * 60 * 60 * 8,
        ).toISOString(),
        likes: ["user1", "user5"],
        comments: [],
        type: "recipe",
        recipe_data: {
          title: "Chocolate Lava Cake",
          difficulty: "Hard",
          cooking_time: 30,
          servings: 2,
          rating: 4.7,
          tags: ["dessert", "chocolate", "cake"],
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults({ users: [], posts: [], recipes: [] });
      return;
    }

    setSearchLoading(true);

    try {
      // Search for users, posts, and assignments in parallel
      const [usersResponse, postsResponse, assignmentsResponse] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/users/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/posts/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/assignments/search?query=${encodeURIComponent(query)}`,
          {
            headers: {
              Authorization: `Bearer ${user.access_token}`,
            },
          }
        )
      ]);

      const users = usersResponse.ok ? (await usersResponse.json()).users || [] : [];
      const searchPosts = postsResponse.ok ? (await postsResponse.json()).posts || [] : [];
      const recipes = assignmentsResponse.ok ? (await assignmentsResponse.json()).assignments || [] : [];

      setSearchResults({ 
        users: users.slice(0, 5), 
        posts: searchPosts.slice(0, 5), 
        recipes: recipes.slice(0, 5) 
      });
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults({ users: [], posts: [], recipes: [] });
    } finally {
      setSearchLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200";
      case "Medium":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200";
      case "Hard":
        return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "instructor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200";
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-muted-foreground">
              Loading feed...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen">

      {!showMobileSidebar && (
        <button
          onClick={() => setShowMobileSidebar(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 lg:hidden bg-[rgba(220,38,38,0)] text-[rgb(208,15,15)] p-3 shadow-lg hover:bg-primary/90 transition-all duration-300 hover:pr-4 rounded-l-[7px] rounded-r-[0px] text-[24px] font-bold"
          aria-label="Open sidebar"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="mb-6 flex gap-6 items-start">

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">

              <div className="overflow-x-auto scrollbar-hide w-full">
                <div className="flex space-x-4 pb-2 pr-4">

                  <div
                    onClick={() => userHasStory ? handleStoryClick(user.id) : setShowStoryCreator(true)}
                    className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                  >
                    <div className="relative">
                      <div
                        className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full p-[2px] ${
                          userHasStory
                            ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"
                            : "bg-gray-300 dark:bg-gray-600"
                        } transition-transform group-hover:scale-105`}
                      >
                        <div className="w-full h-full bg-background rounded-full p-[2px]">
                          {user.avatar_url && user.avatar_url.trim() !== '' ? (
                            <ImageWithFallback
                              src={user.avatar_url}
                              alt={user.name}
                              className="w-full h-full object-cover rounded-full"
                              fallback={
                                <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center">
                                  <span className="text-white font-semibold text-lg lg:text-xl">
                                    {user.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              }
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-lg lg:text-xl">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div 
                        className="absolute bottom-0 right-0 w-5 h-5 lg:w-6 lg:h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background cursor-pointer hover:scale-110 transition-transform"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowStoryCreator(true);
                        }}
                      >
                        <Plus className="h-3 w-3 lg:h-4 lg:w-4 text-white" />
                      </div>
                    </div>
                    <span className="text-xs text-foreground mt-1 text-center max-w-[70px] truncate">
                      Your Story
                    </span>
                  </div>


                  {storyGroups.map((group) => {
                    if (group.user_id === user.id) return null;
                    
                    const hasStory = group.has_story && group.stories && group.stories.length > 0;
                    const hasAvatar = group.user_avatar && group.user_avatar.trim() !== '';
                    
                    return (
                      <div
                        key={group.user_id}
                        onClick={() => hasStory ? handleStoryClick(group.user_id) : onNavigate('account', group.user_id)}
                        className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
                      >
                        <div className="relative">
                          <div
                            className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full p-[2px] ${
                              hasStory && group.has_unviewed
                                ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500"
                                : hasStory
                                ? "bg-gray-400"
                                : "bg-gray-200 dark:bg-gray-700"
                            } transition-transform group-hover:scale-105`}
                          >
                            <div className="w-full h-full bg-background rounded-full p-[2px]">
                              {hasAvatar ? (
                                <ImageWithFallback
                                  src={group.user_avatar}
                                  alt={group.user_name}
                                  className="w-full h-full object-cover rounded-full"
                                  fallback={
                                    <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center">
                                      <span className="text-white font-semibold text-lg lg:text-xl">
                                        {group.user_name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                  }
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 dark:from-slate-700 dark:to-slate-800 rounded-full flex items-center justify-center">
                                  <span className="text-white font-semibold text-lg lg:text-xl">
                                    {group.user_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-foreground mt-1 text-center max-w-[70px] truncate">
                          {group.user_name.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>



        </div>

        <div className="flex gap-6 relative">

          <div className="flex-1 max-w-7xl mx-auto lg:mx-0">

            <div className="hidden lg:block post-card p-4 lg:p-6 mb-6">
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
                  placeholder={`What's cooking? Share your culinary adventure...`}
                  className="flex-1 input-clean px-4 py-3 rounded-full border text-sm lg:text-base placeholder-muted-foreground"
                  onClick={() => setShowCreatePost(true)}
                  readOnly
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex space-x-2 lg:space-x-4">
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="flex items-center space-x-1 lg:space-x-2 px-3 lg:px-4 py-2 btn-secondary rounded-lg transition-colors text-sm lg:text-base hover:bg-secondary/80"
                  >
                    <ImageIcon className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                    <span className="hidden sm:inline">Photo</span>
                  </button>
                </div>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map((post, index) => (
                <div
                  key={post.id}
                  className="post-card overflow-hidden"
                >

                  {post.images && post.images.length > 0 ? (
                    <div className="h-48 relative overflow-hidden group">
                      <ImageWithFallback
                        src={post.images[0]}
                        alt={post.recipe_data?.title || "Post image"}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className={`h-48 ${postBackgroundColors[index % postBackgroundColors.length]} flex items-center justify-center p-6`}>
                      <p className="text-foreground text-center line-clamp-4">
                        {post.content}
                      </p>
                    </div>
                  )}


                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate("account", post.author_id);
                        }}
                        className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                      >
                        <div className="w-6 h-6 avatar-gradient rounded-full flex items-center justify-center overflow-hidden">
                          {post.author_avatar ? (
                            <ImageWithFallback
                              src={post.author_avatar}
                              alt={post.author_name}
                              className="w-full h-full object-cover"
                              fallback={
                                <span className="text-white text-xs">
                                  {post.author_name.charAt(0).toUpperCase()}
                                </span>
                              }
                            />
                          ) : (
                            <span className="text-white text-xs">
                              {post.author_name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {post.author_name}
                        </span>
                      </button>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(post.id);
                          }}
                          className="flex items-center space-x-1 hover:scale-110 transition-transform"
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              post.likes.includes(user.id)
                                ? "fill-red-500 text-red-500"
                                : "text-foreground"
                            }`}
                          />
                          <span className="text-sm text-foreground">{post.likes.length}</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowComments(showComments === post.id ? null : post.id);
                          }}
                          className="flex items-center space-x-1 hover:scale-110 transition-transform"
                        >
                          <MessageCircle className="h-4 w-4 text-foreground" />
                          <span className="text-sm text-foreground">{post.comments.length}</span>
                        </button>
                      </div>
                    </div>


                    {post.images && post.images.length > 0 && post.content && (
                      <p className="text-sm text-foreground mb-2 line-clamp-2">
                        {post.content}
                      </p>
                    )}


                    {showComments === post.id && (
                      <div className="border-t border-border pt-3 mt-3">

                        {post.comments.length > 0 && (
                          <div className="space-y-3 mb-3 max-h-60 overflow-y-auto">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="space-y-2">
                                <div className="flex items-start space-x-2">
                                  <div className="w-6 h-6 avatar-gradient rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    <span className="text-white text-xs">
                                      {comment.author_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="bg-secondary rounded-lg p-2">
                                      <p className="text-xs font-medium text-foreground">
                                        {comment.author_name}
                                      </p>
                                      <p className="text-sm text-foreground">
                                        {comment.content}
                                      </p>
                                    </div>
                                    <div className="flex items-center space-x-3 mt-1 pl-2">
                                      <span className="text-xs text-muted-foreground">
                                        {formatDate(comment.created_at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}


                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 avatar-gradient rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {user.avatar_url ? (
                              <ImageWithFallback
                                src={user.avatar_url}
                                alt={user.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white text-xs">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
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
                            className="flex-1 px-3 py-2 input-clean text-sm rounded-full"
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            disabled={!commentText[post.id]?.trim()}
                            className="p-2 text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary rounded-full transition-colors"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>


          <div className="hidden lg:block w-80 space-y-4 sticky top-24 h-fit">
            <SidebarContent
              user={user}
              topRankedRecipes={topRecipes}
              currentTip={currentTip}
              cookingTips={cookingTips}
              getDifficultyColor={getDifficultyColor}
              suggestedUsers={suggestedUsers}
              followingUsers={followingUsers}
              followLoading={followLoading}
              onFollowToggle={handleFollowToggle}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      </div>


      {showMobileSidebar && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-card z-50 overflow-y-auto lg:hidden border-l border-border">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  Discover
                </h2>
                <button
                  onClick={() => setShowMobileSidebar(false)}
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <SidebarContent
                user={user}
                topRankedRecipes={topRecipes}
                currentTip={currentTip}
                cookingTips={cookingTips}
                getDifficultyColor={getDifficultyColor}
                suggestedUsers={suggestedUsers}
                followingUsers={followingUsers}
                followLoading={followLoading}
                onFollowToggle={handleFollowToggle}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        </>
      )}


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


      {showStoryCreator && (
        <StoryCreator
          user={user}
          onClose={() => setShowStoryCreator(false)}
          onStoryCreated={() => {
            setShowStoryCreator(false);
            loadStories();
          }}
        />
      )}


      {showStoryViewer && storyGroups.length > 0 && (
        <StoryViewer
          storyGroups={storyGroups.filter(group => group.stories && group.stories.length > 0)}
          initialGroupIndex={viewerStartIndex}
          currentUserId={user.id}
          accessToken={user.access_token || ''}
          onClose={() => setShowStoryViewer(false)}
          onStoryView={handleStoryView}
        />
      )}
    </div>
    </>
  );
}

interface SidebarContentProps {
  user: User;
  topRankedRecipes: Recipe[];
  currentTip: number;
  cookingTips: any[];
  getDifficultyColor: (difficulty: string) => string;
  suggestedUsers: any[];
  followingUsers: Set<string>;
  followLoading: Set<string>;
  onFollowToggle: (userId: string) => void;
  onNavigate: (page: string, id?: string) => void;
}

function SidebarContent({
  user,
  topRankedRecipes,
  currentTip,
  cookingTips,
  getDifficultyColor,
  suggestedUsers,
  followingUsers,
  followLoading,
  onFollowToggle,
  onNavigate,
}: SidebarContentProps) {
  return (
    <>

      <div className="post-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">
            Suggestions for you
          </h3>
          <button className="text-xs text-primary hover:text-primary/80">
            See All
          </button>
        </div>

        <div className="space-y-3">
          {suggestedUsers.length > 0 ? (
            suggestedUsers.map((suggestedUser) => {
              const isFollowing = followingUsers.has(suggestedUser.id);
              const isLoading = followLoading.has(suggestedUser.id);

              return (
                <div
                  key={suggestedUser.id}
                  className="flex items-center justify-between hover:bg-secondary/50 p-2 rounded-lg transition-colors"
                >
                  <div 
                    className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => onNavigate('account', suggestedUser.id)}
                  >
                    <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {suggestedUser.avatar_url ? (
                        <ImageWithFallback
                          src={suggestedUser.avatar_url}
                          alt={suggestedUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-medium">
                          {suggestedUser.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm truncate">
                        {suggestedUser.name}
                      </h4>
                      <p className="text-xs text-muted-foreground capitalize">
                        {suggestedUser.role}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFollowToggle(suggestedUser.id);
                    }}
                    disabled={isLoading}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ml-2 ${
                      isFollowing
                        ? "bg-secondary text-foreground hover:bg-muted border border-border"
                        : "bg-primary text-white hover:bg-primary/90"
                    } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isLoading ? (
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                    ) : isFollowing ? (
                      "Followed"
                    ) : (
                      "Follow"
                    )}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No suggestions available</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Cooking Tips */}
      <div className="post-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">
            Daily Cooking Tips
          </h3>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              Live
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 transition-all duration-500">
          <div className="flex items-center space-x-2 mb-3">
            <span className="text-2xl">{cookingTips[currentTip].icon}</span>
            <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
              {cookingTips[currentTip].category}
            </span>
          </div>
          <h4 className="font-medium text-foreground mb-2">
            {cookingTips[currentTip].title}
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {cookingTips[currentTip].tip}
          </p>
          <div className="flex items-center justify-center mt-4 space-x-1">
            {cookingTips.slice(0, 5).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentTip % 5
                    ? "bg-primary w-6"
                    : "bg-border"
                }`}
              />
            ))}
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

      setTimeout(() => {
        onSuccess();
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="post-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border p-4 lg:p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Create New Post
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 lg:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center overflow-hidden p-0.5">
              {user.avatar_url ? (
                <ImageWithFallback
                  src={user.avatar_url}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-full"
                  fallback={
                    <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                      <span className="text-foreground text-sm font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  }
                />
              ) : (
                <div className="w-full h-full bg-card rounded-full flex items-center justify-center">
                  <span className="text-foreground text-sm font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role}
              </p>
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's cooking? Share your recipe or cooking experience..."
            className="w-full p-3 border-0 resize-none focus:outline-none text-sm placeholder-muted-foreground bg-transparent text-foreground"
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

          <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
            <label className="flex items-center space-x-2 px-3 py-2 btn-secondary rounded-lg cursor-pointer transition-colors text-sm">
              <Camera className="h-4 w-4" />
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
              className="px-6 py-2 btn-gradient rounded-lg transition-colors disabled:opacity-50 text-sm font-semibold"
            >
              {loading ? "Sharing..." : "Share"}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
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
      <div className="post-card max-w-lg w-full">
        <div className="p-4 lg:p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Edit Post
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground text-xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full p-3 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm placeholder-muted-foreground bg-input text-foreground"
            rows={6}
            placeholder="Edit your post..."
          />

          <div className="flex items-center justify-end space-x-3 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 btn-secondary rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => onSave(content)}
              disabled={!content.trim()}
              className="px-6 py-2 btn-gradient rounded-lg transition-colors disabled:opacity-50 text-sm font-semibold"
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
      <div className="post-card max-w-sm w-full p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Delete Post
        </h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Are you sure you want to delete this post? This action cannot be undone.
        </p>
        <div className="flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 btn-secondary rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(postId)}
            className="px-6 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-semibold"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
