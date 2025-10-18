import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  Send,
} from "lucide-react";
import { projectId } from "../utils/supabase/info";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { LinkifiedText } from "../utils/linkify";
import { UserRoleBadge } from "./UserRoleBadge";
import { StoryCreator } from "./StoryCreator";
import { StoryViewer } from "./StoryViewer";
import { StarRating } from "./StarRating";
import { RecipeDetailModal } from "./RecipeDetailModal";

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

interface Rating {
  user_id: string;
  user_name: string;
  rating: number;
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
  ratings?: Rating[];
  type?: "recipe" | "post";
  recipe_data?: {
    title: string;
    difficulty: "Easy" | "Medium" | "Hard";
    cooking_time: number;
    servings: number;
    rating: number;
    tags: string[];
    ingredients?: string;
    instructions?: string;
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
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "following" | "newest" | "popular">("all");


  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [userHasStory, setUserHasStory] = useState(false);
  

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ users: any[], posts: any[], recipes: any[] }>({ users: [], posts: [], recipes: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  

  const [selectedRecipe, setSelectedRecipe] = useState<Post | null>(null);


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


    const feedInterval = setInterval(() => {
      loadFeed();
    }, 30000);


    const recipesInterval = setInterval(() => {
      loadTopRecipes();
    }, 300000);


    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };


    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]') && !target.closest('[data-dropdown-trigger]')) {
        setActiveDropdown(null);
      }

    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("click", handleClickOutside);


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
          signal: AbortSignal.timeout(10000),
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

      loadStories();
    } catch (error) {
      console.error("Error marking story as viewed:", error);
    }
  };

  const handleStoryClick = (userId: string) => {

    const groupsWithStories = storyGroups.filter(group => group.stories && group.stories.length > 0);
    
    if (groupsWithStories.length === 0) return;
    

    const index = groupsWithStories.findIndex(group => group.user_id === userId);
    
    if (index === -1) return; 
    
    setViewerStartIndex(index);
    setShowStoryViewer(true);
  };

  const loadSuggestedUsers = async () => {
    try {
      if (!user.access_token) return;


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

        const suggestions = (allUsers || [])
          .filter((u: any) => u.id !== user.id)
          .slice(0, 3);
        setSuggestedUsers(suggestions);
      }


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
          ingredients: `1 1/2 cups Arborio rice
4 cups vegetable or chicken stock, warmed
1/2 cup dry white wine
1 lb mixed wild mushrooms (shiitake, oyster, cremini), sliced
1 medium onion, finely diced
3 cloves garlic, minced
1/2 cup Parmesan cheese, grated
3 tbsp butter
2 tbsp olive oil
Fresh thyme, chopped
Salt and pepper to taste
Fresh parsley for garnish`,
          instructions: `Heat stock in a pot and keep warm on low heat
In a large pan, heat olive oil and 1 tbsp butter over medium heat
Sauté mushrooms until golden, season with salt and pepper, then set aside
In the same pan, sauté onion until translucent, about 3-4 minutes
Add garlic and cook for 1 minute until fragrant
Add rice and toast for 2 minutes, stirring constantly
Pour in white wine and stir until absorbed
Add stock one ladle at a time, stirring frequently and waiting for liquid to absorb before adding more
Continue for about 20-25 minutes until rice is creamy and al dente
Stir in mushrooms, remaining butter, Parmesan, and thyme
Season with salt and pepper to taste
Garnish with fresh parsley and serve immediately`,
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
          ingredients: `1 cup quinoa, rinsed
2 cups vegetable broth
1 cup cherry tomatoes, halved
1 cucumber, diced
1/2 red onion, thinly sliced
1/2 cup kalamata olives, pitted
1/2 cup feta cheese, crumbled
1 bell pepper, roasted and sliced
2 cups mixed greens
1/4 cup tahini
2 tbsp lemon juice
1 clove garlic, minced
Olive oil, salt, and pepper`,
          instructions: `Cook quinoa in vegetable broth according to package directions, about 15 minutes
While quinoa cooks, prepare vegetables and set aside
Make dressing by whisking tahini, lemon juice, garlic, and 2-3 tbsp water until smooth
Season dressing with salt and pepper
Fluff cooked quinoa with a fork and let cool slightly
In bowls, layer mixed greens and quinoa
Top with tomatoes, cucumber, onion, olives, bell pepper, and feta
Drizzle with tahini dressing
Serve immediately or refrigerate for meal prep`,
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
          ingredients: `2 cups all-purpose flour, plus extra for dusting
3 large eggs
1/2 tsp salt
1 tbsp olive oil
Semolina flour for dusting
Water as needed`,
          instructions: `Mound flour on a clean work surface and make a well in the center
Crack eggs into the well and add salt and olive oil
Using a fork, beat eggs gently and begin to incorporate flour from the edges
Continue mixing until a rough dough forms
Knead dough for 8-10 minutes until smooth and elastic
Wrap in plastic wrap and rest for 30 minutes at room temperature
Divide dough into 4 pieces and flatten each slightly
Roll out each piece using a pasta machine or rolling pin until very thin
Dust with semolina and fold dough loosely, then cut into fettuccine strips
Unravel pasta and dust with more semolina to prevent sticking
Cook in boiling salted water for 2-3 minutes until al dente
Toss with your favorite sauce and serve immediately`,
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
          ingredients: `4 oz dark chocolate (70% cocoa), chopped
1/2 cup unsalted butter
2 large eggs
2 egg yolks
1/4 cup granulated sugar
Pinch of salt
2 tbsp all-purpose flour
Butter and cocoa powder for ramekins
Vanilla ice cream for serving`,
          instructions: `Preheat oven to 425°F (220°C)
Butter four 6-oz ramekins and dust with cocoa powder
Melt chocolate and butter together in a double boiler, stirring until smooth
In a bowl, whisk eggs, egg yolks, sugar, and salt until thick and pale
Fold melted chocolate mixture into egg mixture
Gently fold in flour until just combined
Divide batter evenly among prepared ramekins
Bake for 12-14 minutes until edges are firm but centers are still soft
Let cool for 1 minute, then carefully invert onto plates
Serve immediately with vanilla ice cream`,
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
    setActiveDropdown(null);
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

      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
      setShowDeleteConfirm(null);
    }
  };

  const handleRateRecipe = async (postId: string, rating: number) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/posts/${postId}/rate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rating }),
        },
      );

      if (response.ok) {
        const { post } = await response.json();
        setPosts((prevPosts) =>
          prevPosts.map((p) => (p.id === postId ? post : p)),
        );
      }
    } catch (error) {
      console.error("Error rating recipe:", error);

      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          if (post.id === postId) {
            const newRating: Rating = {
              user_id: user.id,
              user_name: user.name,
              rating,
              created_at: new Date().toISOString(),
            };
            const existingRatings = post.ratings || [];
            const filteredRatings = existingRatings.filter(r => r.user_id !== user.id);
            return {
              ...post,
              ratings: [...filteredRatings, newRating],
            };
          }
          return post;
        }),
      );
    }
  };

  const calculateAverageRating = (ratings?: Rating[]): number => {
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return sum / ratings.length;
  };

  const getUserRating = (ratings?: Rating[]): number => {
    if (!ratings) return 0;
    const userRating = ratings.find(r => r.user_id === user.id);
    return userRating ? userRating.rating : 0;
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
      {/* Floating Arrow Button for Mobile Sidebar */}
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
        {/* Story Circles Section and User Header */}
        <div className="mb-6 flex gap-6 items-start">
          {/* Story Circles - Full width on mobile, flex-1 on desktop */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              {/* Story Circles */}
              <div className="overflow-x-auto scrollbar-hide w-full">
                <div className="flex space-x-4 pb-2 pr-4">
                  {/* User's own story - add story button */}
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
                      {/* Always show add button - allows adding more stories */}
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

                  {/* Other users' stories */}
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
          {/* Main Feed */}
          <div className="flex-1 max-w-7xl mx-auto lg:mx-0">
            {/* Create Post Section - Hidden on Mobile */}
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


          

            {/* Feed Posts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map((post, index) => (
                <div
                  key={post.id}
                  className="post-card overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {

                    if (post.type === "recipe" && post.recipe_data) {
                      setSelectedRecipe(post);
                    } else {
                      setSelectedPost(post);
                    }
                  }}
                >
                  {/* Post Content  */}
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

                  {/* Post Footer */}
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

                        {post.author_id === user.id && (
                          <div className="relative">
                            <button
                              ref={(el) => {
                                dropdownButtonRefs.current[post.id] = el;
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeDropdown === post.id) {
                                  setActiveDropdown(null);
                                  setDropdownPosition(null);
                                } else {
                                  const button = dropdownButtonRefs.current[post.id];
                                  if (button) {
                                    const rect = button.getBoundingClientRect();
                                    const dropdownWidth = 192; 
                                    const dropdownHeight = 120; 
                                    

                                    let left = rect.right + window.scrollX - dropdownWidth;
                                    let top = rect.bottom + window.scrollY + 8;
                                    
  
                                    if (left < 10) {
                                      left = 10;
                                    }
                                    

                                    if (left + dropdownWidth > window.innerWidth - 10) {
                                      left = window.innerWidth - dropdownWidth - 10;
                                    }
                                    

                                    if (top + dropdownHeight > window.innerHeight + window.scrollY - 10) {
                                      top = rect.top + window.scrollY - dropdownHeight - 8;
                                    }
                                    
                                    setDropdownPosition({ top, left });
                                  }
                                  setActiveDropdown(post.id);
                                }
                              }}
                              className="p-1 hover:bg-secondary rounded-full transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4 text-foreground" />
                            </button>
                          </div>
                        )}
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

                    {/* Rating Section */}
                    {post.type === "recipe" && (
                      <div className="mt-3 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Average Rating</p>
                            <StarRating
                              rating={calculateAverageRating(post.ratings)}
                              size="sm"
                              showCount
                              count={post.ratings?.length || 0}
                            />
                          </div>
                          {post.recipe_data && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRecipe(post);
                              }}
                              className="text-xs text-primary hover:underline font-medium"
                            >
                              View Recipe →
                            </button>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground mb-1">
                            {getUserRating(post.ratings) > 0 ? "Your Rating" : "Rate this recipe"}
                          </p>
                          <StarRating
                            rating={getUserRating(post.ratings)}
                            size="sm"
                            interactive
                            userRating={getUserRating(post.ratings)}
                            onRate={(rating) => handleRateRecipe(post.id, rating)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Sidebar */}
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

      {/* Mobile Sidebar */}
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

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePostModal
          user={user}
          onClose={() => setShowCreatePost(false)}
          onSuccess={(newPost) => {
            setShowCreatePost(false);
            if (newPost) {

              setPosts(prev => [newPost, ...prev]);
            } else {

              loadFeed();
            }
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

      {/* Story Viewer Modal */}
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

      {/* Post Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          user={user}
          onClose={() => setSelectedPost(null)}
          onLike={handleLike}
          onComment={(postId, content) => {
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
            setSelectedPost((prev) =>
              prev
                ? {
                    ...prev,
                    comments: [...prev.comments, newComment],
                  }
                : null,
            );
          }}
          onRate={(postId, rating) => {
            handleRateRecipe(postId, rating);

            const newRating: Rating = {
              user_id: user.id,
              user_name: user.name,
              rating,
              created_at: new Date().toISOString(),
            };
            setSelectedPost((prev) => {
              if (!prev || prev.id !== postId) return prev;
              const existingRatings = prev.ratings || [];
              const filteredRatings = existingRatings.filter(r => r.user_id !== user.id);
              return {
                ...prev,
                ratings: [...filteredRatings, newRating],
              };
            });
          }}
          onNavigate={onNavigate}
        />
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          post={selectedRecipe}
          user={user}
          onClose={() => setSelectedRecipe(null)}
          onRate={(rating) => {
            handleRateRecipe(selectedRecipe.id, rating);

            const newRating: Rating = {
              user_id: user.id,
              user_name: user.name,
              rating,
              created_at: new Date().toISOString(),
            };
            setSelectedRecipe((prev) => {
              if (!prev || prev.id !== selectedRecipe.id) return prev;
              const existingRatings = prev.ratings || [];
              const filteredRatings = existingRatings.filter(r => r.user_id !== user.id);
              return {
                ...prev,
                ratings: [...filteredRatings, newRating],
              };
            });
          }}
          onComment={(postId, content) => {
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
            setSelectedRecipe((prev) =>
              prev
                ? {
                    ...prev,
                    comments: [...prev.comments, newComment],
                  }
                : null,
            );
          }}
          onLike={handleLike}
          onNavigate={onNavigate}
        />
      )}


      {activeDropdown && dropdownPosition && createPortal(
        <div
          className="fixed w-48 post-card shadow-lg rounded-lg overflow-hidden z-50"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              const post = posts.find(p => p.id === activeDropdown);
              if (post) {
                setEditingPost(post);
                setEditContent(post.content);
              }
              setActiveDropdown(null);
              setDropdownPosition(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Post</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(activeDropdown);
              setActiveDropdown(null);
              setDropdownPosition(null);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center space-x-2 text-red-500"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Post</span>
          </button>
        </div>,
        document.body
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
      {/* Suggestions for you */}
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
  onSuccess: (post?: Post) => void;
}

function CreatePostModal({
  user,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  const [postType, setPostType] = useState<"post" | "recipe">("post");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  

  const [recipeTitle, setRecipeTitle] = useState("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [cookingTime, setCookingTime] = useState("");
  const [servings, setServings] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [instructions, setInstructions] = useState("");
  const [tags, setTags] = useState("");

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
    

    if (postType === "recipe") {
      if (!recipeTitle.trim()) {
        setError("Recipe title is required");
        return;
      }
      if (!content.trim() && !ingredients.trim() && !instructions.trim()) {
        setError("Please add some description, ingredients, or instructions");
        return;
      }
    } else {
      if (!content.trim() && images.length === 0) return;
    }

    setLoading(true);
    setError("");

    try {
      const imageUrls: string[] = [];


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


      const postPayload: any = {
        content: content.trim(),
        images: imageUrls,
      };
      
      if (postType === "recipe") {
        postPayload.type = "recipe";
        postPayload.recipe_data = {
          title: recipeTitle.trim(),
          difficulty,
          cooking_time: parseInt(cookingTime) || 30,
          servings: parseInt(servings) || 2,
          rating: 0,
          tags: tags.split(',').map(t => t.trim()).filter(t => t),
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
        };
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/posts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postPayload),
        },
      );

      if (response.ok) {
        const { post: createdPost } = await response.json();
        onSuccess(createdPost);
      } else {
        const { error } = await response.json();
        setError(error || "Failed to create post");
      }
    } catch (err) {
      console.error("Post creation error:", err);

      const newPost: Post = {
        id: `post_${Date.now()}`,
        content: content.trim(),
        images: [], 
        author_id: user.id,
        author_name: user.name,
        author_role: user.role,
        author_avatar: user.avatar_url,
        created_at: new Date().toISOString(),
        likes: [],
        comments: [],
        ratings: [],
      };
      
      if (postType === "recipe") {
        newPost.type = "recipe";
        newPost.recipe_data = {
          title: recipeTitle.trim(),
          difficulty,
          cooking_time: parseInt(cookingTime) || 30,
          servings: parseInt(servings) || 2,
          rating: 0,
          tags: tags.split(',').map(t => t.trim()).filter(t => t),
          ingredients: ingredients.trim(),
          instructions: instructions.trim(),
        };
      }
      
      setTimeout(() => {
        onSuccess(newPost);
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
              Create New {postType === "recipe" ? "Recipe" : "Post"}
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


          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => setPostType("post")}
              className={`flex-1 py-2 px-4 rounded-lg transition-all text-sm font-medium ${
                postType === "post"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-4 w-4" />
                <span>Regular Post</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPostType("recipe")}
              className={`flex-1 py-2 px-4 rounded-lg transition-all text-sm font-medium ${
                postType === "recipe"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <ChefHat className="h-4 w-4" />
                <span>Recipe</span>
              </div>
            </button>
          </div>

          {/* Recipe-specific fields */}
          {postType === "recipe" && (
            <div className="space-y-3 mb-4 p-3 bg-secondary/30 rounded-lg">
              {/* Recipe Title */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Recipe Title *
                </label>
                <input
                  type="text"
                  value={recipeTitle}
                  onChange={(e) => setRecipeTitle(e.target.value)}
                  placeholder="e.g., Classic Spaghetti Carbonara"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required={postType === "recipe"}
                />
              </div>

              {/* Difficulty, Time, Servings Row */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as "Easy" | "Medium" | "Hard")}
                    className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Time (min)
                  </label>
                  <input
                    type="number"
                    value={cookingTime}
                    onChange={(e) => setCookingTime(e.target.value)}
                    placeholder="30"
                    min="1"
                    className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Servings
                  </label>
                  <input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                    placeholder="4"
                    min="1"
                    className="w-full px-2 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Ingredients (one per line)
                </label>
                <textarea
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="2 cups flour&#10;1 cup sugar&#10;3 eggs"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                />
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Instructions (one step per line)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Preheat oven to 350°F&#10;Mix dry ingredients&#10;Add wet ingredients"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="italian, pasta, comfort-food"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {/* Description/Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              postType === "recipe"
                ? "Share your cooking tips and story behind this recipe..."
                : "What's cooking? Share your thoughts..."
            }
            className="w-full p-3 border-0 resize-none focus:outline-none text-sm placeholder-muted-foreground bg-transparent text-foreground"
            rows={postType === "recipe" ? 3 : 4}
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
                postType === "recipe"
                  ? !recipeTitle.trim() || loading
                  : (!content.trim() && images.length === 0) || loading
              }
              className="px-6 py-2 btn-gradient rounded-lg transition-colors disabled:opacity-50 text-sm font-semibold"
            >
              {loading ? "Sharing..." : postType === "recipe" ? "Share Recipe" : "Share"}
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

interface PostDetailModalProps {
  post: Post;
  user: User;
  onClose: () => void;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onRate: (postId: string, rating: number) => void;
  onNavigate: (view: string, userId?: string) => void;
}

function PostDetailModal({ post, user, onClose, onLike, onComment, onRate, onNavigate }: PostDetailModalProps) {
  const [commentText, setCommentText] = useState("");

  const handleComment = () => {
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText("");
    }
  };

  const ratings = post.ratings || [];
  const averageRating = ratings.length > 0
    ? ratings.reduce((acc, r) => acc + r.rating, 0) / ratings.length
    : 0;
  const userRating = ratings.find(r => r.user_id === user.id)?.rating || 0;

  const parseIngredients = (text?: string): string[] => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim());
  };

  const parseInstructions = (text?: string): string[] => {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim());
  };

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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-6xl max-h-[90vh] bg-background rounded-lg overflow-hidden flex flex-col lg:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left Side - Image */}
        <div className="lg:w-3/5 bg-black flex items-center justify-center">
          {post.images && post.images.length > 0 ? (
            <ImageWithFallback
              src={post.images[0]}
              alt={post.recipe_data?.title || "Post image"}
              className="w-full h-full object-contain max-h-[90vh]"
            />
          ) : (
            <div className="w-full h-64 lg:h-full flex items-center justify-center p-8">
              <p className="text-white text-center text-lg">
                {post.content}
              </p>
            </div>
          )}
        </div>

        {/* Right Side - Details and Comments */}
        <div className="lg:w-2/5 flex flex-col max-h-[90vh] lg:max-h-none">
          {/* Post Header */}
          <div className="p-4 border-b border-border">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("account", post.author_id);
                onClose();
              }}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 avatar-gradient rounded-full flex items-center justify-center overflow-hidden">
                {post.author_avatar ? (
                  <ImageWithFallback
                    src={post.author_avatar}
                    alt={post.author_name}
                    className="w-full h-full object-cover"
                    fallback={
                      <span className="text-white text-sm">
                        {post.author_name.charAt(0).toUpperCase()}
                      </span>
                    }
                  />
                ) : (
                  <span className="text-white text-sm">
                    {post.author_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-foreground">{post.author_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </button>
          </div>

          {/* Post Content & Recipe Data */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Recipe Title */}
            {post.recipe_data?.title && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {post.recipe_data.title}
                </h2>
              </div>
            )}

            {/* Post Description */}
            {post.content && (
              <div>
                <p className="text-foreground whitespace-pre-wrap">
                  <LinkifiedText text={post.content} />
                </p>
              </div>
            )}

            {/* Recipe Metadata */}
            {post.recipe_data && (
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="p-2 bg-secondary/30 rounded-lg text-center">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="text-sm font-medium text-foreground">
                    {post.recipe_data.cooking_time} min
                  </p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Servings</p>
                  <p className="text-sm font-medium text-foreground">
                    {post.recipe_data.servings}
                  </p>
                </div>
                <div className="p-2 bg-secondary/30 rounded-lg text-center">
                  <ChefHat className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Difficulty</p>
                  <p
                    className={`text-xs font-medium px-2 py-0.5 rounded ${getDifficultyColor(
                      post.recipe_data.difficulty
                    )}`}
                  >
                    {post.recipe_data.difficulty}
                  </p>
                </div>
              </div>
            )}

            {/* Tags */}
            {post.recipe_data?.tags && post.recipe_data.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.recipe_data.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-primary/10 text-primary rounded text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Ingredients */}
            {post.recipe_data?.ingredients && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Ingredients
                </h3>
                <ul className="space-y-1.5">
                  {parseIngredients(post.recipe_data.ingredients).map((ingredient, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <span className="text-primary mt-0.5">•</span>
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions */}
            {post.recipe_data?.instructions && (
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Instructions
                </h3>
                <ol className="space-y-2">
                  {parseInstructions(post.recipe_data.instructions).map((instruction, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-foreground"
                    >
                      <span className="flex-shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </span>
                      <span className="pt-0.5">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Rating Section - Only for recipe posts */}
            {post.type === "recipe" && (
              <>
                <div className="p-3 bg-secondary/30 rounded-lg space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1.5">Average Rating</p>
                    <StarRating
                      rating={averageRating}
                      size="md"
                      showCount
                      count={ratings.length}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1.5">
                      {userRating > 0 ? "Your Rating" : "Rate this recipe"}
                    </p>
                    <StarRating
                      rating={userRating}
                      size="md"
                      interactive
                      userRating={userRating}
                      onRate={(rating) => onRate(post.id, rating)}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border my-4" />
              </>
            )}

            {/* Comments Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Comments ({post.comments.length})</h3>
              
              {post.comments.length > 0 ? (
                <div className="space-y-3">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="flex items-start space-x-3">
                      <div className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <span className="text-white text-xs">
                          {comment.author_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-secondary rounded-lg p-3">
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
                <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
              )}
            </div>
          </div>

          {/* Post Actions & Comment Input */}
          <div className="border-t border-border p-4 space-y-3 bg-background">
            {/* Like and Comment Counts */}
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLike(post.id);
                }}
                className="flex items-center space-x-2 hover:scale-105 transition-transform"
              >
                <Heart
                  className={`h-5 w-5 ${
                    post.likes.includes(user.id)
                      ? "fill-red-500 text-red-500"
                      : "text-foreground"
                  }`}
                />
                <span className="text-foreground">{post.likes.length} likes</span>
              </button>
              
              <div className="flex items-center space-x-1 text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                <span>{post.comments.length} comments</span>
              </div>
            </div>

            {/* Comment Input */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 avatar-gradient rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleComment()}
                className="flex-1 px-3 py-2 input-clean text-sm rounded-full"
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
        </div>
      </div>
    </div>
  );
}
