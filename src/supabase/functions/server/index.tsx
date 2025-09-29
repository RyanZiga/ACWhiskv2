import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["*"],
    allowMethods: ["*"],
  }),
);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Initialize storage buckets
async function initializeBuckets() {
  const buckets = [
    "make-c56dfc7a-recipes",
    "make-c56dfc7a-portfolios",
    "make-c56dfc7a-resources",
    "make-c56dfc7a-posts",
    "make-c56dfc7a-photos",
    "make-c56dfc7a-avatars",
    "make-c56dfc7a-assignments",
    "make-c56dfc7a-submissions",
  ];

  for (const bucketName of buckets) {
    const { data: existingBuckets } =
      await supabase.storage.listBuckets();
    const bucketExists = existingBuckets?.some(
      (bucket) => bucket.name === bucketName,
    );

    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName);
      console.log(`Created bucket: ${bucketName}`);
    }
  }
}

// Initialize buckets on startup
initializeBuckets();

// Auth helper function
async function getUserFromToken(accessToken: string) {
  if (!accessToken) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
}

// Helper function to ensure user profile has all required fields
function ensureUserProfile(profile: any) {
  return {
    id: profile?.id || "",
    email: profile?.email || "",
    name: profile?.name || "",
    role: profile?.role || "student",
    status: profile?.status || "active",
    created_at: profile?.created_at || new Date().toISOString(),
    last_login: profile?.last_login || null,
    portfolio: profile?.portfolio || {},
    achievements: Array.isArray(profile?.achievements)
      ? profile.achievements
      : [],
    bio: profile?.bio || "",
    location: profile?.location || "",
    skills: Array.isArray(profile?.skills)
      ? profile.skills
      : [],
    avatar_url: profile?.avatar_url || "",
    followers: Array.isArray(profile?.followers)
      ? profile.followers
      : [],
    following: Array.isArray(profile?.following)
      ? profile.following
      : [],
    privacy_settings: profile?.privacy_settings || {
      profile_visible: true,
      posts_visible: true,
      photos_visible: true,
    },
  };
}

// Sign up endpoint
app.post("/make-server-c56dfc7a/signup", async (c) => {
  try {
    const {
      email,
      password,
      name,
      role = "student",
    } = await c.req.json();

    const { data, error } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name, role },
        email_confirm: true,
      });

    if (error) {
      return c.json(
        { error: `Signup error: ${error.message}` },
        400,
      );
    }

    // Store user profile in KV store with all required fields
    const userProfile = ensureUserProfile({
      id: data.user.id,
      email,
      name,
      role,
      status: "active",
      created_at: new Date().toISOString(),
    });

    await kv.set(`user:${data.user.id}`, userProfile);

    return c.json({ user: data.user });
  } catch (error) {
    console.log("Signup error:", error);
    return c.json(
      { error: "Internal server error during signup" },
      500,
    );
  }
});

// Get user profile
app.get("/make-server-c56dfc7a/profile", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await kv.get(`user:${user.id}`);
    const safeProfile = ensureUserProfile(profile);
    
    // Update last login time
    safeProfile.last_login = new Date().toISOString();
    await kv.set(`user:${user.id}`, safeProfile);
    
    return c.json({ profile: safeProfile });
  } catch (error) {
    console.log("Profile fetch error:", error);
    return c.json({ error: "Error fetching profile" }, 500);
  }
});

// Get user profile by ID
app.get("/make-server-c56dfc7a/users/:id", async (c) => {
  try {
    const userId = c.req.param("id");
    const profile = await kv.get(`user:${userId}`);

    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }

    // Ensure profile has all required fields and return safe public profile
    const safeProfile = ensureUserProfile(profile);
    const publicProfile = {
      id: safeProfile.id,
      name: safeProfile.name,
      role: safeProfile.role,
      bio: safeProfile.bio,
      location: safeProfile.location,
      skills: safeProfile.skills,
      avatar_url: safeProfile.avatar_url,
      created_at: safeProfile.created_at,
      followers: safeProfile.followers,
      following: safeProfile.following,
    };

    return c.json({ profile: publicProfile });
  } catch (error) {
    console.log("User profile fetch error:", error);
    return c.json(
      { error: "Error fetching user profile" },
      500,
    );
  }
});

// Search users
app.get("/make-server-c56dfc7a/search/users", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const query = c.req.query("q")?.toLowerCase() || "";
    const allUsers = await kv.getByPrefix("user:");

    const filteredUsers = allUsers
      .filter((userProfile: any) => {
        const safeProfile = ensureUserProfile(userProfile);
        return (
          safeProfile.name.toLowerCase().includes(query) ||
          safeProfile.bio.toLowerCase().includes(query) ||
          (safeProfile.skills &&
            safeProfile.skills.some((skill: string) =>
              skill.toLowerCase().includes(query),
            ))
        );
      })
      .map((userProfile: any) => {
        const safeProfile = ensureUserProfile(userProfile);
        return {
          id: safeProfile.id,
          name: safeProfile.name,
          role: safeProfile.role,
          bio: safeProfile.bio,
          avatar_url: safeProfile.avatar_url,
          followers: safeProfile.followers,
          following: safeProfile.following,
        };
      });

    return c.json({ users: filteredUsers });
  } catch (error) {
    console.log("User search error:", error);
    return c.json({ error: "Error searching users" }, 500);
  }
});

// Update user profile
app.put("/make-server-c56dfc7a/profile", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const updates = await c.req.json();
    const currentProfile = await kv.get(`user:${user.id}`);
    const safeCurrentProfile =
      ensureUserProfile(currentProfile);

    const updatedProfile = {
      ...safeCurrentProfile,
      ...updates,
    };
    await kv.set(`user:${user.id}`, updatedProfile);

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log("Profile update error:", error);
    return c.json({ error: "Error updating profile" }, 500);
  }
});

// Follow/Unfollow user
app.post(
  "/make-server-c56dfc7a/users/:id/follow",
  async (c) => {
    try {
      const accessToken = c.req
        .header("Authorization")
        ?.split(" ")[1];
      const user = await getUserFromToken(accessToken!);

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const targetUserId = c.req.param("id");
      const { action } = await c.req.json(); // 'follow' or 'unfollow'

      const currentUserProfile = await kv.get(
        `user:${user.id}`,
      );
      const targetUserProfile = await kv.get(
        `user:${targetUserId}`,
      );

      if (!targetUserProfile) {
        return c.json({ error: "User not found" }, 404);
      }

      const safeCurrentProfile = ensureUserProfile(
        currentUserProfile,
      );
      const safeTargetProfile = ensureUserProfile(
        targetUserProfile,
      );

      if (action === "follow") {
        if (
          !safeCurrentProfile.following.includes(targetUserId)
        ) {
          safeCurrentProfile.following.push(targetUserId);
          safeTargetProfile.followers.push(user.id);
        }
      } else if (action === "unfollow") {
        safeCurrentProfile.following =
          safeCurrentProfile.following.filter(
            (id: string) => id !== targetUserId,
          );
        safeTargetProfile.followers =
          safeTargetProfile.followers.filter(
            (id: string) => id !== user.id,
          );
      }

      await kv.set(`user:${user.id}`, safeCurrentProfile);
      await kv.set(`user:${targetUserId}`, safeTargetProfile);

      return c.json({ success: true });
    } catch (error) {
      console.log("Follow/unfollow error:", error);
      return c.json(
        { error: "Error updating follow status" },
        500,
      );
    }
  },
);

// Create post
app.post("/make-server-c56dfc7a/posts", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { content, images = [] } = await c.req.json();
    const postId = crypto.randomUUID();

    const post = {
      id: postId,
      content,
      images: Array.isArray(images) ? images : [],
      author_id: user.id,
      author_name: user.user_metadata.name,
      author_role: user.user_metadata.role,
      created_at: new Date().toISOString(),
      likes: [],
      comments: [],
    };

    await kv.set(`post:${postId}`, post);

    // Add to user's posts list
    const userPosts =
      (await kv.get(`user_posts:${user.id}`)) || [];
    const safeUserPosts = Array.isArray(userPosts)
      ? userPosts
      : [];
    safeUserPosts.unshift(postId);
    await kv.set(`user_posts:${user.id}`, safeUserPosts);

    return c.json({ post });
  } catch (error) {
    console.log("Post creation error:", error);
    return c.json({ error: "Error creating post" }, 500);
  }
});

// Update post
app.put("/make-server-c56dfc7a/posts/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const { content } = await c.req.json();

    const post = await kv.get(`post:${postId}`);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    if (post.author_id !== user.id) {
      return c.json(
        { error: "Unauthorized - Not your post" },
        403,
      );
    }

    post.content = content;
    post.updated_at = new Date().toISOString();
    await kv.set(`post:${postId}`, post);

    return c.json({ post });
  } catch (error) {
    console.log("Post update error:", error);
    return c.json({ error: "Error updating post" }, 500);
  }
});

// Delete post
app.delete("/make-server-c56dfc7a/posts/:id", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const post = await kv.get(`post:${postId}`);

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    if (post.author_id !== user.id) {
      return c.json(
        { error: "Unauthorized - Not your post" },
        403,
      );
    }

    // Remove from posts
    await kv.del(`post:${postId}`);

    // Remove from user's posts list
    const userPosts =
      (await kv.get(`user_posts:${user.id}`)) || [];
    const updatedUserPosts = userPosts.filter(
      (id: string) => id !== postId,
    );
    await kv.set(`user_posts:${user.id}`, updatedUserPosts);

    return c.json({ success: true });
  } catch (error) {
    console.log("Post deletion error:", error);
    return c.json({ error: "Error deleting post" }, 500);
  }
});

// Get feed posts
app.get("/make-server-c56dfc7a/feed", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const allPosts = await kv.getByPrefix("post:");
    const safePosts = Array.isArray(allPosts) ? allPosts : [];
    const sortedPosts = safePosts.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    );

    return c.json({ posts: sortedPosts });
  } catch (error) {
    console.log("Feed fetch error:", error);
    return c.json({ error: "Error fetching feed" }, 500);
  }
});

// Get user posts
app.get("/make-server-c56dfc7a/users/:id/posts", async (c) => {
  try {
    const userId = c.req.param("id");
    const userPostIds =
      (await kv.get(`user_posts:${userId}`)) || [];
    const safeUserPostIds = Array.isArray(userPostIds)
      ? userPostIds
      : [];

    const posts = [];
    for (const postId of safeUserPostIds) {
      const post = await kv.get(`post:${postId}`);
      if (post) {
        // Ensure post has all required fields
        const safePost = {
          ...post,
          images: Array.isArray(post.images) ? post.images : [],
          likes: Array.isArray(post.likes) ? post.likes : [],
          comments: Array.isArray(post.comments)
            ? post.comments
            : [],
        };
        posts.push(safePost);
      }
    }

    return c.json({ posts });
  } catch (error) {
    console.log("User posts fetch error:", error);
    return c.json({ error: "Error fetching user posts" }, 500);
  }
});

// Like/Unlike post
app.post("/make-server-c56dfc7a/posts/:id/like", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const post = await kv.get(`post:${postId}`);

    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Ensure likes array exists
    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    const userLikeIndex = post.likes.indexOf(user.id);
    if (userLikeIndex > -1) {
      post.likes.splice(userLikeIndex, 1);
    } else {
      post.likes.push(user.id);
    }

    await kv.set(`post:${postId}`, post);

    return c.json({ post });
  } catch (error) {
    console.log("Post like error:", error);
    return c.json({ error: "Error liking post" }, 500);
  }
});

// Comment on post
app.post(
  "/make-server-c56dfc7a/posts/:id/comment",
  async (c) => {
    try {
      const accessToken = c.req
        .header("Authorization")
        ?.split(" ")[1];
      const user = await getUserFromToken(accessToken!);

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const postId = c.req.param("id");
      const { content } = await c.req.json();

      const post = await kv.get(`post:${postId}`);
      if (!post) {
        return c.json({ error: "Post not found" }, 404);
      }

      // Ensure comments array exists
      if (!Array.isArray(post.comments)) {
        post.comments = [];
      }

      const comment = {
        id: crypto.randomUUID(),
        content,
        author_id: user.id,
        author_name: user.user_metadata.name,
        created_at: new Date().toISOString(),
      };

      post.comments.push(comment);
      await kv.set(`post:${postId}`, post);

      return c.json({ post });
    } catch (error) {
      console.log("Post comment error:", error);
      return c.json({ error: "Error commenting on post" }, 500);
    }
  },
);

// Get top-rated recipes
app.get(
  "/make-server-c56dfc7a/recipes/top-rated",
  async (c) => {
    try {
      const recipes = await kv.getByPrefix("recipe:");
      const safeRecipes = Array.isArray(recipes) ? recipes : [];

      // Calculate average rating for each recipe
      const recipesWithRatings = safeRecipes.map(
        (recipe: any) => {
          const ratings = Array.isArray(recipe.ratings)
            ? recipe.ratings
            : [];
          let averageRating = 0;

          if (ratings.length > 0) {
            const sum = ratings.reduce(
              (acc: number, rating: any) =>
                acc + (rating.rating || 0),
              0,
            );
            averageRating = sum / ratings.length;
          }

          return {
            ...recipe,
            rating: averageRating,
            ratingCount: ratings.length,
          };
        },
      );

      // Sort by rating and minimum number of ratings
      const topRecipes = recipesWithRatings
        .filter((recipe: any) => recipe.ratingCount >= 1) // At least 1 rating
        .sort((a: any, b: any) => {
          if (b.rating !== a.rating) {
            return b.rating - a.rating; // Higher rating first
          }
          return b.ratingCount - a.ratingCount; // More ratings as tiebreaker
        })
        .slice(0, 10); // Top 10

      return c.json({ recipes: topRecipes });
    } catch (error) {
      console.log("Top recipes fetch error:", error);
      return c.json(
        { error: "Error fetching top recipes" },
        500,
      );
    }
  },
);

// Create conversation
app.post("/make-server-c56dfc7a/conversations", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { participant_id } = await c.req.json();
    const conversationId = crypto.randomUUID();

    // Check if conversation already exists
    const userConversations =
      (await kv.get(`user_conversations:${user.id}`)) || [];
    const participantConversations =
      (await kv.get(`user_conversations:${participant_id}`)) ||
      [];

    const safeUserConversations = Array.isArray(
      userConversations,
    )
      ? userConversations
      : [];
    const safeParticipantConversations = Array.isArray(
      participantConversations,
    )
      ? participantConversations
      : [];

    // Find existing conversation between these users
    const existingConversation = safeUserConversations.find(
      (convId: string) => {
        return safeParticipantConversations.includes(convId);
      },
    );

    if (existingConversation) {
      const conversation = await kv.get(
        `conversation:${existingConversation}`,
      );
      return c.json({ conversation });
    }

    const conversation = {
      id: conversationId,
      participants: [user.id, participant_id],
      created_at: new Date().toISOString(),
      last_message: null,
      messages: [],
    };

    await kv.set(
      `conversation:${conversationId}`,
      conversation,
    );

    // Update user conversations lists
    safeUserConversations.push(conversationId);
    safeParticipantConversations.push(conversationId);
    await kv.set(
      `user_conversations:${user.id}`,
      safeUserConversations,
    );
    await kv.set(
      `user_conversations:${participant_id}`,
      safeParticipantConversations,
    );

    return c.json({ conversation });
  } catch (error) {
    console.log("Conversation creation error:", error);
    return c.json(
      { error: "Error creating conversation" },
      500,
    );
  }
});

// Get user conversations
app.get("/make-server-c56dfc7a/conversations", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userConversationIds =
      (await kv.get(`user_conversations:${user.id}`)) || [];
    const safeUserConversationIds = Array.isArray(
      userConversationIds,
    )
      ? userConversationIds
      : [];
    const conversations = [];

    for (const convId of safeUserConversationIds) {
      const conversation = await kv.get(
        `conversation:${convId}`,
      );
      if (conversation) {
        // Get participant info
        const otherParticipantId =
          conversation.participants.find(
            (id: string) => id !== user.id,
          );
        const participantProfile = await kv.get(
          `user:${otherParticipantId}`,
        );
        const safeParticipantProfile = ensureUserProfile(
          participantProfile,
        );

        conversation.participant = {
          id: safeParticipantProfile.id,
          name: safeParticipantProfile.name,
          avatar_url: safeParticipantProfile.avatar_url,
        };
        conversations.push(conversation);
      }
    }

    return c.json({ conversations });
  } catch (error) {
    console.log("Conversations fetch error:", error);
    return c.json(
      { error: "Error fetching conversations" },
      500,
    );
  }
});

// Send message
app.post(
  "/make-server-c56dfc7a/conversations/:id/messages",
  async (c) => {
    try {
      const accessToken = c.req
        .header("Authorization")
        ?.split(" ")[1];
      const user = await getUserFromToken(accessToken!);

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const conversationId = c.req.param("id");
      const { content } = await c.req.json();

      const conversation = await kv.get(
        `conversation:${conversationId}`,
      );
      if (!conversation) {
        return c.json({ error: "Conversation not found" }, 404);
      }

      if (!conversation.participants.includes(user.id)) {
        return c.json({ error: "Unauthorized" }, 403);
      }

      // Ensure messages array exists
      if (!Array.isArray(conversation.messages)) {
        conversation.messages = [];
      }

      const message = {
        id: crypto.randomUUID(),
        content,
        sender_id: user.id,
        sender_name: user.user_metadata.name,
        created_at: new Date().toISOString(),
      };

      conversation.messages.push(message);
      conversation.last_message = message;
      await kv.set(
        `conversation:${conversationId}`,
        conversation,
      );

      return c.json({ conversation });
    } catch (error) {
      console.log("Message send error:", error);
      return c.json({ error: "Error sending message" }, 500);
    }
  },
);

// Get conversation messages
app.get(
  "/make-server-c56dfc7a/conversations/:id/messages",
  async (c) => {
    try {
      const accessToken = c.req
        .header("Authorization")
        ?.split(" ")[1];
      const user = await getUserFromToken(accessToken!);

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const conversationId = c.req.param("id");
      const conversation = await kv.get(
        `conversation:${conversationId}`,
      );

      if (!conversation) {
        return c.json({ error: "Conversation not found" }, 404);
      }

      if (!conversation.participants.includes(user.id)) {
        return c.json({ error: "Unauthorized" }, 403);
      }

      const messages = Array.isArray(conversation.messages)
        ? conversation.messages
        : [];
      return c.json({ messages });
    } catch (error) {
      console.log("Messages fetch error:", error);
      return c.json({ error: "Error fetching messages" }, 500);
    }
  },
);

// Create recipe (existing endpoint)
app.post("/make-server-c56dfc7a/recipes", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const recipe = await c.req.json();
    const recipeId = crypto.randomUUID();

    const recipeData = {
      id: recipeId,
      ...recipe,
      author_id: user.id,
      author_name: user.user_metadata.name,
      created_at: new Date().toISOString(),
      ratings: [],
      comments: [],
    };

    await kv.set(`recipe:${recipeId}`, recipeData);

    // Add to user's recipes list
    const userRecipes =
      (await kv.get(`user_recipes:${user.id}`)) || [];
    const safeUserRecipes = Array.isArray(userRecipes)
      ? userRecipes
      : [];
    safeUserRecipes.push(recipeId);
    await kv.set(`user_recipes:${user.id}`, safeUserRecipes);

    return c.json({ recipe: recipeData });
  } catch (error) {
    console.log("Recipe creation error:", error);
    return c.json({ error: "Error creating recipe" }, 500);
  }
});

// Get all recipes
app.get("/make-server-c56dfc7a/recipes", async (c) => {
  try {
    const recipes = await kv.getByPrefix("recipe:");
    const safeRecipes = Array.isArray(recipes) ? recipes : [];
    return c.json({ recipes: safeRecipes });
  } catch (error) {
    console.log("Recipes fetch error:", error);
    return c.json({ error: "Error fetching recipes" }, 500);
  }
});

// Get single recipe
app.get("/make-server-c56dfc7a/recipes/:id", async (c) => {
  try {
    const recipeId = c.req.param("id");
    const recipe = await kv.get(`recipe:${recipeId}`);

    if (!recipe) {
      return c.json({ error: "Recipe not found" }, 404);
    }

    return c.json({ recipe });
  } catch (error) {
    console.log("Recipe fetch error:", error);
    return c.json({ error: "Error fetching recipe" }, 500);
  }
});

// Rate recipe
app.post(
  "/make-server-c56dfc7a/recipes/:id/rate",
  async (c) => {
    try {
      const accessToken = c.req
        .header("Authorization")
        ?.split(" ")[1];
      const user = await getUserFromToken(accessToken!);

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const recipeId = c.req.param("id");
      const { rating, comment } = await c.req.json();

      const recipe = await kv.get(`recipe:${recipeId}`);
      if (!recipe) {
        return c.json({ error: "Recipe not found" }, 404);
      }

      // Ensure ratings array exists
      if (!Array.isArray(recipe.ratings)) {
        recipe.ratings = [];
      }

      // Remove existing rating from this user
      recipe.ratings = recipe.ratings.filter(
        (r: any) => r.user_id !== user.id,
      );

      // Add new rating
      recipe.ratings.push({
        user_id: user.id,
        user_name: user.user_metadata.name,
        rating,
        comment,
        created_at: new Date().toISOString(),
      });

      await kv.set(`recipe:${recipeId}`, recipe);

      return c.json({ recipe });
    } catch (error) {
      console.log("Recipe rating error:", error);
      return c.json({ error: "Error rating recipe" }, 500);
    }
  },
);

// Create forum post
app.post("/make-server-c56dfc7a/forum", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { title, content, category } = await c.req.json();
    const postId = crypto.randomUUID();

    const post = {
      id: postId,
      title,
      content,
      category,
      author_id: user.id,
      author_name: user.user_metadata.name,
      author_role: user.user_metadata.role,
      created_at: new Date().toISOString(),
      replies: [],
    };

    await kv.set(`forum_post:${postId}`, post);

    return c.json({ post });
  } catch (error) {
    console.log("Forum post creation error:", error);
    return c.json({ error: "Error creating forum post" }, 500);
  }
});

// Get forum posts
app.get("/make-server-c56dfc7a/forum", async (c) => {
  try {
    const posts = await kv.getByPrefix("forum_post:");
    const safePosts = Array.isArray(posts) ? posts : [];
    return c.json({ posts: safePosts });
  } catch (error) {
    console.log("Forum posts fetch error:", error);
    return c.json({ error: "Error fetching forum posts" }, 500);
  }
});

// Reply to forum post
app.post("/make-server-c56dfc7a/forum/:id/reply", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const { content } = await c.req.json();

    const post = await kv.get(`forum_post:${postId}`);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Ensure replies array exists
    if (!Array.isArray(post.replies)) {
      post.replies = [];
    }

    const reply = {
      id: crypto.randomUUID(),
      content,
      author_id: user.id,
      author_name: user.user_metadata.name,
      author_role: user.user_metadata.role,
      created_at: new Date().toISOString(),
    };

    post.replies.push(reply);
    await kv.set(`forum_post:${postId}`, post);

    return c.json({ post });
  } catch (error) {
    console.log("Forum reply error:", error);
    return c.json({ error: "Error adding reply" }, 500);
  }
});

// Create resource (for instructors)
app.post("/make-server-c56dfc7a/resources", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || user.user_metadata.role !== "instructor") {
      return c.json(
        { error: "Unauthorized - Instructor access required" },
        403,
      );
    }

    const resource = await c.req.json();
    const resourceId = crypto.randomUUID();

    const resourceData = {
      id: resourceId,
      ...resource,
      author_id: user.id,
      author_name: user.user_metadata.name,
      created_at: new Date().toISOString(),
    };

    await kv.set(`resource:${resourceId}`, resourceData);

    return c.json({ resource: resourceData });
  } catch (error) {
    console.log("Resource creation error:", error);
    return c.json({ error: "Error creating resource" }, 500);
  }
});

// Get resources
app.get("/make-server-c56dfc7a/resources", async (c) => {
  try {
    const resources = await kv.getByPrefix("resource:");
    const safeResources = Array.isArray(resources)
      ? resources
      : [];
    return c.json({ resources: safeResources });
  } catch (error) {
    console.log("Resources fetch error:", error);
    return c.json({ error: "Error fetching resources" }, 500);
  }
});

// Get users (admin only)
app.get("/make-server-c56dfc7a/users", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || user.user_metadata.role !== "admin") {
      return c.json(
        { error: "Unauthorized - Admin access required" },
        403,
      );
    }

    const users = await kv.getByPrefix("user:");
    const safeUsers = Array.isArray(users)
      ? users.map(ensureUserProfile)
      : [];
    return c.json({ users: safeUsers });
  } catch (error) {
    console.log("Users fetch error:", error);
    return c.json({ error: "Error fetching users" }, 500);
  }
});

// File upload endpoint
app.post("/make-server-c56dfc7a/upload/:bucket", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const bucket = c.req.param("bucket");
    const bucketName = `make-c56dfc7a-${bucket}`;

    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const fileName = `${user.id}/${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
      });

    if (error) {
      return c.json(
        { error: `File upload error: ${error.message}` },
        400,
      );
    }

    // Create signed URL
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

    return c.json({ url: urlData?.signedUrl, path: fileName });
  } catch (error) {
    console.log("File upload error:", error);
    return c.json({ error: "Error uploading file" }, 500);
  }
});

// Search endpoint
app.get("/make-server-c56dfc7a/search", async (c) => {
  try {
    const query = c.req.query("q")?.toLowerCase() || "";
    const type = c.req.query("type") || "all";

    let results: any[] = [];

    if (type === "all" || type === "recipes") {
      const recipes = await kv.getByPrefix("recipe:");
      const safeRecipes = Array.isArray(recipes) ? recipes : [];
      const filteredRecipes = safeRecipes.filter(
        (recipe: any) =>
          recipe.title?.toLowerCase().includes(query) ||
          recipe.description?.toLowerCase().includes(query) ||
          (Array.isArray(recipe.ingredients) &&
            recipe.ingredients.some((ing: string) =>
              ing.toLowerCase().includes(query),
            )),
      );
      results.push(
        ...filteredRecipes.map((r: any) => ({
          ...r,
          type: "recipe",
        })),
      );
    }

    if (type === "all" || type === "forum") {
      const posts = await kv.getByPrefix("forum_post:");
      const safePosts = Array.isArray(posts) ? posts : [];
      const filteredPosts = safePosts.filter(
        (post: any) =>
          post.title?.toLowerCase().includes(query) ||
          post.content?.toLowerCase().includes(query),
      );
      results.push(
        ...filteredPosts.map((p: any) => ({
          ...p,
          type: "forum",
        })),
      );
    }

    if (type === "all" || type === "resources") {
      const resources = await kv.getByPrefix("resource:");
      const safeResources = Array.isArray(resources)
        ? resources
        : [];
      const filteredResources = safeResources.filter(
        (resource: any) =>
          resource.title?.toLowerCase().includes(query) ||
          resource.description?.toLowerCase().includes(query),
      );
      results.push(
        ...filteredResources.map((r: any) => ({
          ...r,
          type: "resource",
        })),
      );
    }

    return c.json({ results });
  } catch (error) {
    console.log("Search error:", error);
    return c.json({ error: "Error performing search" }, 500);
  }
});

// Admin-only endpoint: Update user role
app.put("/make-server-c56dfc7a/admin/users/:id/role", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || user.user_metadata.role !== "admin") {
      return c.json({ error: "Unauthorized - Admin access required" }, 403);
    }

    const targetUserId = c.req.param("id");
    const { role } = await c.req.json();

    if (!["student", "instructor", "admin"].includes(role)) {
      return c.json({ error: "Invalid role" }, 400);
    }

    const targetProfile = await kv.get(`user:${targetUserId}`);
    if (!targetProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    const safeTargetProfile = ensureUserProfile(targetProfile);
    safeTargetProfile.role = role;
    
    await kv.set(`user:${targetUserId}`, safeTargetProfile);

    console.log(`Admin ${user.user_metadata.name} changed user ${safeTargetProfile.name} role to ${role}`);

    return c.json({ 
      success: true, 
      user: {
        id: safeTargetProfile.id,
        name: safeTargetProfile.name,
        email: safeTargetProfile.email,
        role: safeTargetProfile.role
      }
    });
  } catch (error) {
    console.log("Admin role update error:", error);
    return c.json({ error: "Error updating user role" }, 500);
  }
});

// Admin-only endpoint: Update user status
app.put("/make-server-c56dfc7a/admin/users/:id/status", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || user.user_metadata.role !== "admin") {
      return c.json({ error: "Unauthorized - Admin access required" }, 403);
    }

    const targetUserId = c.req.param("id");
    const { status } = await c.req.json();

    if (!["active", "suspended", "banned"].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    const targetProfile = await kv.get(`user:${targetUserId}`);
    if (!targetProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    const safeTargetProfile = ensureUserProfile(targetProfile);
    safeTargetProfile.status = status;
    
    await kv.set(`user:${targetUserId}`, safeTargetProfile);

    console.log(`Admin ${user.user_metadata.name} changed user ${safeTargetProfile.name} status to ${status}`);

    return c.json({ 
      success: true, 
      user: {
        id: safeTargetProfile.id,
        name: safeTargetProfile.name,
        email: safeTargetProfile.email,
        role: safeTargetProfile.role,
        status: safeTargetProfile.status
      }
    });
  } catch (error) {
    console.log("Admin status update error:", error);
    return c.json({ error: "Error updating user status" }, 500);
  }
});

// ================== MESSAGING ENDPOINTS ==================

// Get user conversations
app.get("/make-server-c56dfc7a/messages/conversations", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const conversations = await kv.getByPrefix(`conversation:`) || [];
    const userConversations = conversations.filter((conv: any) =>
      conv.participants?.some((p: any) => p.id === user.id)
    );

    return c.json({ conversations: userConversations });
  } catch (error) {
    console.log("Error loading conversations:", error);
    return c.json({ error: "Error loading conversations" }, 500);
  }
});

// Create new conversation
app.post("/make-server-c56dfc7a/messages/conversations", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { type, participantIds, groupName } = await c.req.json();
    const conversationId = crypto.randomUUID();

    // Get participant details
    const participants = [user];
    for (const id of participantIds) {
      const participant = await kv.get(`user:${id}`);
      if (participant) {
        participants.push({
          id: participant.id,
          name: participant.name,
          avatar: participant.avatar_url,
          online: false
        });
      }
    }

    const conversation = {
      id: conversationId,
      type,
      participants: participants.map(p => ({
        id: p.id,
        name: p.name || p.user_metadata?.name,
        avatar: p.avatar || p.avatar_url,
        online: false
      })),
      groupName: type === 'group' ? groupName : undefined,
      lastMessage: {
        content: "Conversation started",
        timestamp: new Date().toISOString(),
        senderId: user.id
      },
      unreadCount: 0,
      created_at: new Date().toISOString()
    };

    await kv.set(`conversation:${conversationId}`, conversation);

    return c.json({ conversation });
  } catch (error) {
    console.log("Error creating conversation:", error);
    return c.json({ error: "Error creating conversation" }, 500);
  }
});

// Get messages for a conversation
app.get("/make-server-c56dfc7a/messages/:conversationId", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const conversationId = c.req.param("conversationId");
    const messages = await kv.getByPrefix(`message:${conversationId}:`) || [];

    // Sort messages by timestamp
    const sortedMessages = messages.sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.log("Error loading messages:", error);
    return c.json({ error: "Error loading messages" }, 500);
  }
});

// Send new message
app.post("/make-server-c56dfc7a/messages", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { conversationId, content, type = 'text', tempId } = await c.req.json();
    const messageId = crypto.randomUUID();

    const message = {
      id: messageId,
      content,
      senderId: user.id,
      timestamp: new Date().toISOString(),
      type,
      status: 'sent'
    };

    await kv.set(`message:${conversationId}:${messageId}`, message);

    // Update conversation's last message
    const conversation = await kv.get(`conversation:${conversationId}`);
    if (conversation) {
      conversation.lastMessage = {
        content,
        timestamp: message.timestamp,
        senderId: user.id
      };
      await kv.set(`conversation:${conversationId}`, conversation);
    }

    return c.json({ message });
  } catch (error) {
    console.log("Error sending message:", error);
    return c.json({ error: "Error sending message" }, 500);
  }
});

// Mark conversation as read
app.post("/make-server-c56dfc7a/messages/:conversationId/read", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const conversationId = c.req.param("conversationId");
    const conversation = await kv.get(`conversation:${conversationId}`);
    
    if (conversation) {
      // Reset unread count for this user
      conversation.unreadCount = 0;
      await kv.set(`conversation:${conversationId}`, conversation);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Error marking conversation as read:", error);
    return c.json({ error: "Error marking conversation as read" }, 500);
  }
});

// ================== USER FOLLOW/SEARCH ENDPOINTS ==================

// Follow user
app.post("/make-server-c56dfc7a/users/:userId/follow", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const targetUserId = c.req.param("userId");
    
    // Get current user profile
    const currentUserProfile = await kv.get(`user:${user.id}`);
    const targetUserProfile = await kv.get(`user:${targetUserId}`);

    if (!targetUserProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    const safeCurrentProfile = ensureUserProfile(currentUserProfile);
    const safeTargetProfile = ensureUserProfile(targetUserProfile);

    // Add to following list
    if (!safeCurrentProfile.following.includes(targetUserId)) {
      safeCurrentProfile.following.push(targetUserId);
    }

    // Add to target's followers list
    if (!safeTargetProfile.followers.includes(user.id)) {
      safeTargetProfile.followers.push(user.id);
    }

    await kv.set(`user:${user.id}`, safeCurrentProfile);
    await kv.set(`user:${targetUserId}`, safeTargetProfile);

    return c.json({ success: true });
  } catch (error) {
    console.log("Error following user:", error);
    return c.json({ error: "Error following user" }, 500);
  }
});

// Unfollow user
app.post("/make-server-c56dfc7a/users/:userId/unfollow", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const targetUserId = c.req.param("userId");
    
    // Get current user profile
    const currentUserProfile = await kv.get(`user:${user.id}`);
    const targetUserProfile = await kv.get(`user:${targetUserId}`);

    if (!targetUserProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    const safeCurrentProfile = ensureUserProfile(currentUserProfile);
    const safeTargetProfile = ensureUserProfile(targetUserProfile);

    // Remove from following list
    safeCurrentProfile.following = safeCurrentProfile.following.filter(
      (id: string) => id !== targetUserId
    );

    // Remove from target's followers list
    safeTargetProfile.followers = safeTargetProfile.followers.filter(
      (id: string) => id !== user.id
    );

    await kv.set(`user:${user.id}`, safeCurrentProfile);
    await kv.set(`user:${targetUserId}`, safeTargetProfile);

    return c.json({ success: true });
  } catch (error) {
    console.log("Error unfollowing user:", error);
    return c.json({ error: "Error unfollowing user" }, 500);
  }
});

// Get user's following list
app.get("/make-server-c56dfc7a/users/following", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    const safeProfile = ensureUserProfile(userProfile);

    const following = [];
    for (const userId of safeProfile.following) {
      const followedUser = await kv.get(`user:${userId}`);
      if (followedUser) {
        following.push({
          id: followedUser.id,
          name: followedUser.name,
          role: followedUser.role,
          avatar_url: followedUser.avatar_url,
          bio: followedUser.bio,
          online: false // Would be populated by real-time system
        });
      }
    }

    return c.json({ following });
  } catch (error) {
    console.log("Error loading following:", error);
    return c.json({ error: "Error loading following" }, 500);
  }
});

// Search users
app.get("/make-server-c56dfc7a/users/search", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const query = c.req.query("q")?.toLowerCase() || "";
    const includeFollowInfo = c.req.query("include_follow_info") === "true";

    const allUsers = await kv.getByPrefix("user:") || [];
    const currentUserProfile = includeFollowInfo ? await kv.get(`user:${user.id}`) : null;
    const safeCurrentProfile = currentUserProfile ? ensureUserProfile(currentUserProfile) : null;

    const filteredUsers = allUsers
      .filter((userProfile: any) => 
        userProfile.id !== user.id && // Exclude current user
        (userProfile.name?.toLowerCase().includes(query) ||
         userProfile.email?.toLowerCase().includes(query) ||
         userProfile.bio?.toLowerCase().includes(query))
      )
      .map((userProfile: any) => {
        const result = {
          id: userProfile.id,
          name: userProfile.name,
          email: userProfile.email,
          role: userProfile.role,
          bio: userProfile.bio,
          avatar_url: userProfile.avatar_url,
          online: false // Would be populated by real-time system
        };

        if (includeFollowInfo && safeCurrentProfile) {
          result.is_following = safeCurrentProfile.following.includes(userProfile.id);
          result.is_follower = safeCurrentProfile.followers.includes(userProfile.id);
          // Calculate mutual connections
          const mutualFollowing = safeCurrentProfile.following.filter(
            (id: string) => userProfile.followers?.includes(id)
          );
          result.mutual_connections = mutualFollowing.length;
        }

        return result;
      });

    return c.json({ users: filteredUsers });
  } catch (error) {
    console.log("Error searching users:", error);
    return c.json({ error: "Error searching users" }, 500);
  }
});

// Get user contacts (simplified - could be enhanced with more complex logic)
app.get("/make-server-c56dfc7a/users/contacts", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // For now, return recent conversation participants as contacts
    const conversations = await kv.getByPrefix(`conversation:`) || [];
    const userConversations = conversations.filter((conv: any) =>
      conv.participants?.some((p: any) => p.id === user.id)
    );

    const contacts = [];
    const seenUsers = new Set();

    for (const conv of userConversations) {
      for (const participant of conv.participants) {
        if (participant.id !== user.id && !seenUsers.has(participant.id)) {
          seenUsers.add(participant.id);
          const userProfile = await kv.get(`user:${participant.id}`);
          if (userProfile) {
            contacts.push({
              id: userProfile.id,
              name: userProfile.name,
              role: userProfile.role,
              avatar_url: userProfile.avatar_url,
              online: false
            });
          }
        }
      }
    }

    return c.json({ contacts });
  } catch (error) {
    console.log("Error loading contacts:", error);
    return c.json({ error: "Error loading contacts" }, 500);
  }
});

// ================== ASSIGNMENT ENDPOINTS ==================

// Create assignment (instructors only)
app.post("/make-server-c56dfc7a/assignments", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    console.log("Assignment creation attempt:", {
      hasUser: !!user,
      userMetadata: user?.user_metadata,
      userRole: user?.user_metadata?.role
    });

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user profile from KV store which has the role
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);
    
    console.log("User profile role check:", {
      kvRole: safeUserProfile.role,
      metadataRole: user.user_metadata?.role
    });

    if (safeUserProfile.role !== "instructor" && safeUserProfile.role !== "admin") {
      return c.json({ 
        error: "Only instructors can create assignments",
        debug: {
          userRole: safeUserProfile.role,
          allowedRoles: ["instructor", "admin"]
        }
      }, 403);
    }

    const assignmentData = await c.req.json();
    const assignmentId = crypto.randomUUID();

    const assignment = {
      id: assignmentId,
      ...assignmentData,
      created_by: user.id,
      instructor_name: safeUserProfile.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      submission_count: 0,
    };

    await kv.set(`assignment:${assignmentId}`, assignment);

    return c.json({ assignment });
  } catch (error) {
    console.log("Assignment creation error:", error);
    return c.json({ error: "Error creating assignment" }, 500);
  }
});

// Get all assignments
app.get("/make-server-c56dfc7a/assignments", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const assignments = await kv.getByPrefix("assignment:");
    const safeAssignments = Array.isArray(assignments) ? assignments : [];

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    // For students, only show published assignments
    // For instructors, show their own assignments
    let filteredAssignments = safeAssignments;

    if (safeUserProfile.role === "student") {
      filteredAssignments = safeAssignments.filter((assignment: any) => 
        assignment.status === "published"
      );
    } else if (safeUserProfile.role === "instructor") {
      filteredAssignments = safeAssignments.filter((assignment: any) => 
        assignment.created_by === user.id
      );
    }

    return c.json({ assignments: filteredAssignments });
  } catch (error) {
    console.log("Assignments fetch error:", error);
    return c.json({ error: "Error fetching assignments" }, 500);
  }
});

// Get single assignment
app.get("/make-server-c56dfc7a/assignments/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const assignmentId = c.req.param("id");
    const assignment = await kv.get(`assignment:${assignmentId}`);

    if (!assignment) {
      return c.json({ error: "Assignment not found" }, 404);
    }

    return c.json({ assignment });
  } catch (error) {
    console.log("Assignment fetch error:", error);
    return c.json({ error: "Error fetching assignment" }, 500);
  }
});

// Update assignment (instructors only)
app.put("/make-server-c56dfc7a/assignments/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const assignmentId = c.req.param("id");
    const assignment = await kv.get(`assignment:${assignmentId}`);

    if (!assignment) {
      return c.json({ error: "Assignment not found" }, 404);
    }

    if (assignment.created_by !== user.id && user.user_metadata.role !== "admin") {
      return c.json({ error: "Unauthorized - Not your assignment" }, 403);
    }

    const updates = await c.req.json();
    const updatedAssignment = {
      ...assignment,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await kv.set(`assignment:${assignmentId}`, updatedAssignment);

    return c.json({ assignment: updatedAssignment });
  } catch (error) {
    console.log("Assignment update error:", error);
    return c.json({ error: "Error updating assignment" }, 500);
  }
});

// Delete assignment (instructors only)
app.delete("/make-server-c56dfc7a/assignments/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const assignmentId = c.req.param("id");
    const assignment = await kv.get(`assignment:${assignmentId}`);

    if (!assignment) {
      return c.json({ error: "Assignment not found" }, 404);
    }

    if (assignment.created_by !== user.id && user.user_metadata.role !== "admin") {
      return c.json({ error: "Unauthorized - Not your assignment" }, 403);
    }

    await kv.del(`assignment:${assignmentId}`);

    return c.json({ success: true });
  } catch (error) {
    console.log("Assignment deletion error:", error);
    return c.json({ error: "Error deleting assignment" }, 500);
  }
});

// ================== SUBMISSION ENDPOINTS ==================

// Create submission (students only)
app.post("/make-server-c56dfc7a/submissions", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    if (safeUserProfile.role !== "student") {
      return c.json({ error: "Only students can submit assignments" }, 403);
    }

    const submissionData = await c.req.json();
    const submissionId = crypto.randomUUID();

    // Check if assignment exists
    const assignment = await kv.get(`assignment:${submissionData.assignment_id}`);
    if (!assignment) {
      return c.json({ error: "Assignment not found" }, 404);
    }

    // Check if assignment is still open
    if (assignment.status !== "published") {
      return c.json({ error: "Assignment is not open for submissions" }, 400);
    }

    // Check deadline
    const deadline = new Date(assignment.deadline);
    if (new Date() > deadline) {
      return c.json({ error: "Assignment deadline has passed" }, 400);
    }

    // Check if student already submitted
    const existingSubmissions = await kv.getByPrefix("submission:");
    const userSubmission = existingSubmissions.find((sub: any) => 
      sub.assignment_id === submissionData.assignment_id && sub.student_id === user.id
    );

    if (userSubmission) {
      return c.json({ error: "You have already submitted this assignment" }, 400);
    }

    const submission = {
      id: submissionId,
      ...submissionData,
      student_id: user.id,
      student_name: safeUserProfile.name,
      submitted_at: new Date().toISOString(),
      status: "submitted",
      images: submissionData.images || [],
      videos: submissionData.videos || [],
    };

    await kv.set(`submission:${submissionId}`, submission);

    // Update assignment submission count
    assignment.submission_count = (assignment.submission_count || 0) + 1;
    await kv.set(`assignment:${assignment.id}`, assignment);

    return c.json({ submission });
  } catch (error) {
    console.log("Submission creation error:", error);
    return c.json({ error: "Error creating submission" }, 500);
  }
});

// Get submissions for user
app.get("/make-server-c56dfc7a/submissions", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = c.req.query("user_id") || user.id;
    const submissions = await kv.getByPrefix("submission:");
    const safeSubmissions = Array.isArray(submissions) ? submissions : [];

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    let filteredSubmissions = safeSubmissions;

    if (safeUserProfile.role === "student") {
      // Students can only see their own submissions
      filteredSubmissions = safeSubmissions.filter((submission: any) => 
        submission.student_id === user.id
      );
    } else if (safeUserProfile.role === "instructor") {
      // Instructors can see submissions for their assignments
      const instructorAssignments = await kv.getByPrefix("assignment:");
      const instructorAssignmentIds = instructorAssignments
        .filter((assignment: any) => assignment.created_by === user.id)
        .map((assignment: any) => assignment.id);

      filteredSubmissions = safeSubmissions.filter((submission: any) => 
        instructorAssignmentIds.includes(submission.assignment_id)
      );
    }

    return c.json({ submissions: filteredSubmissions });
  } catch (error) {
    console.log("Submissions fetch error:", error);
    return c.json({ error: "Error fetching submissions" }, 500);
  }
});

// Get pending submissions for instructor
app.get("/make-server-c56dfc7a/submissions/pending", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    if (safeUserProfile.role !== "instructor" && safeUserProfile.role !== "admin") {
      return c.json({ error: "Only instructors can view pending submissions" }, 403);
    }

    const instructorId = c.req.query("instructor_id") || user.id;
    
    // Get instructor's assignments
    const assignments = await kv.getByPrefix("assignment:");
    const instructorAssignments = assignments.filter((assignment: any) => 
      assignment.created_by === instructorId
    );
    const assignmentIds = instructorAssignments.map((assignment: any) => assignment.id);

    // Get all submissions for instructor's assignments
    const submissions = await kv.getByPrefix("submission:");
    const pendingSubmissions = submissions.filter((submission: any) => 
      assignmentIds.includes(submission.assignment_id) && submission.status === "submitted"
    );

    // Calculate stats
    const today = new Date().toDateString();
    const gradedToday = submissions.filter((submission: any) => 
      assignmentIds.includes(submission.assignment_id) && 
      submission.status === "graded" &&
      submission.graded_at && 
      new Date(submission.graded_at).toDateString() === today
    ).length;

    const gradedSubmissions = submissions.filter((submission: any) => 
      assignmentIds.includes(submission.assignment_id) && 
      submission.status === "graded" && 
      submission.grade !== undefined
    );
    
    const averageScore = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((sum: number, sub: any) => sum + (sub.grade || 0), 0) / gradedSubmissions.length
      : 0;

    return c.json({ 
      submissions: pendingSubmissions,
      graded_today: gradedToday,
      average_score: averageScore
    });
  } catch (error) {
    console.log("Pending submissions fetch error:", error);
    return c.json({ error: "Error fetching pending submissions" }, 500);
  }
});

// Grade submission (instructors only)
app.put("/make-server-c56dfc7a/submissions/:id/grade", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    if (safeUserProfile.role !== "instructor" && safeUserProfile.role !== "admin") {
      return c.json({ error: "Only instructors can grade submissions" }, 403);
    }

    const submissionId = c.req.param("id");
    const submission = await kv.get(`submission:${submissionId}`);

    if (!submission) {
      return c.json({ error: "Submission not found" }, 404);
    }

    // Verify instructor owns the assignment
    const assignment = await kv.get(`assignment:${submission.assignment_id}`);
    if (!assignment) {
      return c.json({ error: "Assignment not found" }, 404);
    }

    if (assignment.created_by !== user.id && safeUserProfile.role !== "admin") {
      return c.json({ error: "Unauthorized - Not your assignment" }, 403);
    }

    const { grade, feedback, instructor_feedback } = await c.req.json();

    const updatedSubmission = {
      ...submission,
      grade,
      feedback,
      instructor_feedback,
      status: "graded",
      graded_at: new Date().toISOString(),
      graded_by: user.id,
    };

    await kv.set(`submission:${submissionId}`, updatedSubmission);

    return c.json({ submission: updatedSubmission });
  } catch (error) {
    console.log("Submission grading error:", error);
    return c.json({ error: "Error grading submission" }, 500);
  }
});

// Get single submission
app.get("/make-server-c56dfc7a/submissions/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const submissionId = c.req.param("id");
    const submission = await kv.get(`submission:${submissionId}`);

    if (!submission) {
      return c.json({ error: "Submission not found" }, 404);
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    // Check permissions
    if (safeUserProfile.role === "student" && submission.student_id !== user.id) {
      return c.json({ error: "Unauthorized - Not your submission" }, 403);
    }

    if (safeUserProfile.role === "instructor") {
      const assignment = await kv.get(`assignment:${submission.assignment_id}`);
      if (!assignment || assignment.created_by !== user.id) {
        return c.json({ error: "Unauthorized - Not your assignment" }, 403);
      }
    }

    return c.json({ submission });
  } catch (error) {
    console.log("Submission fetch error:", error);
    return c.json({ error: "Error fetching submission" }, 500);
  }
});

// Delete submission (students can delete their own submissions)
app.delete("/make-server-c56dfc7a/submissions/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const submissionId = c.req.param("id");
    const submission = await kv.get(`submission:${submissionId}`);

    if (!submission) {
      return c.json({ error: "Submission not found" }, 404);
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    // Students can only delete their own submissions
    if (safeUserProfile.role === "student" && submission.student_id !== user.id) {
      return c.json({ error: "Unauthorized - Not your submission" }, 403);
    }

    // Instructors can delete submissions for their assignments (if needed)
    if (safeUserProfile.role === "instructor") {
      const assignment = await kv.get(`assignment:${submission.assignment_id}`);
      if (!assignment || assignment.created_by !== user.id) {
        return c.json({ error: "Unauthorized - Not your assignment" }, 403);
      }
    }

    // Admin can delete any submission
    if (!["student", "instructor", "admin"].includes(safeUserProfile.role)) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    // Delete the submission
    await kv.del(`submission:${submissionId}`);

    // Update assignment submission count
    const assignment = await kv.get(`assignment:${submission.assignment_id}`);
    if (assignment) {
      assignment.submission_count = Math.max(0, (assignment.submission_count || 1) - 1);
      await kv.set(`assignment:${assignment.id}`, assignment);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log("Submission deletion error:", error);
    return c.json({ error: "Error deleting submission" }, 500);
  }
});

// Upload files for assignment submission
app.post("/make-server-c56dfc7a/submissions/upload", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      console.log("Submission upload: No user found from token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user profile from KV store
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    // Allow students and instructors to upload submission files
    // Instructors might need to upload example files or test submissions
    console.log(`Submission upload: User ${user.id} has role: ${safeUserProfile.role}`);
    if (!["student", "instructor"].includes(safeUserProfile.role)) {
      console.log(`Submission upload: Role ${safeUserProfile.role} not allowed`);
      return c.json({ error: "Only students and instructors can upload submission files" }, 403);
    }

    const bucketName = "make-c56dfc7a-submissions";
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type (images and videos only)
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'
    ];

    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        error: "Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, OGG, AVI, MOV) are allowed." 
      }, 400);
    }

    // Check file size (max 50MB for videos, 10MB for images)
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const maxSizeMB = file.type.startsWith('video/') ? '50MB' : '10MB';
      return c.json({ 
        error: `File size too large. Maximum size is ${maxSizeMB}.` 
      }, 400);
    }

    const timestamp = Date.now();
    const fileName = `${user.id}/${timestamp}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
      });

    if (error) {
      return c.json(
        { error: `File upload error: ${error.message}` },
        400,
      );
    }

    // Create signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 60 * 60 * 24 * 365);

    return c.json({ 
      url: urlData?.signedUrl, 
      path: fileName,
      type: file.type.startsWith('video/') ? 'video' : 'image',
      size: file.size,
      name: file.name
    });
  } catch (error) {
    console.log("Submission file upload error:", error);
    return c.json({ error: "Error uploading file" }, 500);
  }
});

// ================== NOTIFICATION ENDPOINTS ==================

// Get user notifications
app.get("/make-server-c56dfc7a/notifications", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get notifications for the user
    const notifications = await kv.getByPrefix(`notification:${user.id}:`);
    const safeNotifications = Array.isArray(notifications) ? notifications : [];

    // Sort by created_at (most recent first)
    const sortedNotifications = safeNotifications.sort((a: any, b: any) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return c.json({ notifications: sortedNotifications });
  } catch (error) {
    console.log("Notifications fetch error:", error);
    return c.json({ error: "Error fetching notifications" }, 500);
  }
});

// Mark notification as read
app.put("/make-server-c56dfc7a/notifications/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const notificationId = c.req.param("id");
    const notification = await kv.get(`notification:${user.id}:${notificationId}`);

    if (!notification) {
      return c.json({ error: "Notification not found" }, 404);
    }

    const updatedNotification = {
      ...notification,
      read: true,
      read_at: new Date().toISOString(),
    };

    await kv.set(`notification:${user.id}:${notificationId}`, updatedNotification);

    return c.json({ notification: updatedNotification });
  } catch (error) {
    console.log("Notification update error:", error);
    return c.json({ error: "Error updating notification" }, 500);
  }
});

// Create notification (internal helper)
async function createNotification(userId: string, type: string, title: string, message: string, relatedId?: string) {
  const notificationId = crypto.randomUUID();
  const notification = {
    id: notificationId,
    user_id: userId,
    type,
    title,
    message,
    related_id: relatedId,
    read: false,
    created_at: new Date().toISOString(),
  };

  await kv.set(`notification:${userId}:${notificationId}`, notification);
  return notification;
}

// Debug endpoint to check user info
app.get("/make-server-c56dfc7a/debug/user", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    return c.json({ 
      authUser: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      profileData: safeUserProfile
    });
  } catch (error) {
    console.log("Debug user error:", error);
    return c.json({ error: "Error getting user debug info" }, 500);
  }
});

// Debug endpoint to update user role (temporary for testing)
app.put("/make-server-c56dfc7a/debug/user/role", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { role } = await c.req.json();
    
    if (!["student", "instructor", "admin"].includes(role)) {
      return c.json({ error: "Invalid role" }, 400);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);
    
    safeUserProfile.role = role;
    await kv.set(`user:${user.id}`, safeUserProfile);

    return c.json({ 
      success: true,
      message: `Role updated to ${role}`,
      profile: safeUserProfile
    });
  } catch (error) {
    console.log("Debug role update error:", error);
    return c.json({ error: "Error updating user role" }, 500);
  }
});

// Check current user role endpoint
app.get("/make-server-c56dfc7a/check-role", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    return c.json({
      user_id: user.id,
      email: user.email,
      role: safeUserProfile.role,
      name: safeUserProfile.name,
      auth_metadata_role: user.user_metadata?.role
    });
  } catch (error) {
    console.log("Role check error:", error);
    return c.json({ error: "Error checking role" }, 500);
  }
});

// Health check endpoint  
app.get("/make-server-c56dfc7a/health", async (c) => {
  try {
    // Test database connection
    const testResult = await kv.get("health-check") || { status: "no-data" };
    await kv.set("health-check", { 
      timestamp: new Date().toISOString(),
      status: "healthy" 
    });

    // Test storage connection
    const { data: buckets } = await supabase.storage.listBuckets();
    const acwhiskBuckets = buckets?.filter(b => b.name.includes('make-c56dfc7a')) || [];

    return c.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      server: "ACWhisk Full-Stack Server",
      database: "connected",
      storage: `${acwhiskBuckets.length} buckets available`,
      buckets: acwhiskBuckets.map(b => b.name)
    });
  } catch (error) {
    console.log("Health check error:", error);
    return c.json({
      status: "error",
      timestamp: new Date().toISOString(),
      server: "ACWhisk Full-Stack Server", 
      error: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

Deno.serve(app.fetch);