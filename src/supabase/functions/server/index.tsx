import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const app = new Hono();

// Middleware must come FIRST
app.use("*", logger(console.log));
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["*"],
    allowMethods: ["*"],
  }),
);

// Add timeout middleware
app.use("*", async (c, next) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout")), 25000)
  );
  
  try {
    await Promise.race([next(), timeoutPromise]);
  } catch (error) {
    if (error.message === "Request timeout") {
      return c.json({ error: "Request timeout" }, 408);
    }
    throw error;
  }
});

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    service: "ACWhisk Messages Server"
  });
});

// Send verification code endpoint
app.post("/make-server-c56dfc7a/send-verification", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    console.log("📧 Sending verification code to:", email);

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in KV with 1 minute expiration
    await kv.set(`verification:${email}`, {
      code: verificationCode,
      timestamp: Date.now(),
      expiresAt: Date.now() + 1 * 60 * 1000 // 1 minute
    });

    console.log("🔑 Generated verification code for:", email);

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ACWhisk <ryan.ziga@medprohealth.net>",
        to: [email],
        subject: "Verify your ACWhisk account",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c9885;">Welcome to ACWhisk!</h2>
            <p>Thank you for signing up. Please use the verification code below to complete your registration:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #7c9885; font-size: 32px; letter-spacing: 8px; margin: 0;">${verificationCode}</h1>
            </div>
            <p>This code will expire in 1 minute.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">ACWhisk - Your Culinary Community Platform</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Resend API error:", error);
      return c.json({ error: "Failed to send verification email" }, 500);
    }

    console.log("✅ Verification email sent successfully");
    return c.json({ success: true, message: "Verification code sent" });
  } catch (error) {
    console.error("❌ Send verification error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Verify code endpoint
app.post("/make-server-c56dfc7a/verify-code", async (c) => {
  try {
    const { email, code } = await c.req.json();

    if (!email || !code) {
      return c.json({ error: "Email and code are required" }, 400);
    }

    console.log("🔍 Verifying code for:", email);

    const storedData = await kv.get(`verification:${email}`);

    if (!storedData) {
      console.log("❌ No verification code found for:", email);
      return c.json({ error: "Invalid or expired verification code" }, 400);
    }

    // Check if code matches
    if (storedData.code !== code) {
      console.log("❌ Code mismatch for:", email);
      return c.json({ error: "Invalid verification code" }, 400);
    }

    // Check if code is expired
    if (Date.now() > storedData.expiresAt) {
      console.log("❌ Expired verification code for:", email);
      await kv.del(`verification:${email}`);
      return c.json({ error: "Verification code has expired" }, 400);
    }

    // Delete the code after successful verification
    await kv.del(`verification:${email}`);

    console.log("✅ Verification successful for:", email);
    return c.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("❌ Verify code error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Send password reset code endpoint
app.post("/make-server-c56dfc7a/send-reset-code", async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    console.log("🔐 Sending password reset code to:", email);

    // Verify user exists in Supabase Auth
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const userExists = users?.some(user => user.email?.toLowerCase() === email.toLowerCase());

    if (!userExists) {
      console.log("❌ User not found:", email);
      // Return success even if user doesn't exist (security best practice)
      return c.json({ success: true, message: "If this email exists, a reset code has been sent" });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store code in KV with 1 minute expiration
    await kv.set(`password_reset:${email}`, {
      code: resetCode,
      timestamp: Date.now(),
      expiresAt: Date.now() + 1 * 60 * 1000 // 1 minute
    });

    console.log("🔑 Generated password reset code for:", email);

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ACWhisk <ryan.ziga@medprohealth.net>",
        to: [email],
        subject: "Reset your ACWhisk password",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c9885;">Password Reset Request</h2>
            <p>You requested to reset your password. Please use the verification code below:</p>
            <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
              <h1 style="color: #7c9885; font-size: 32px; letter-spacing: 8px; margin: 0;">${resetCode}</h1>
            </div>
            <p>This code will expire in 1 minute.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">ACWhisk - Your Culinary Community Platform</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Resend API error:", error);
      return c.json({ error: "Failed to send reset email" }, 500);
    }

    console.log("✅ Password reset email sent successfully");
    return c.json({ success: true, message: "Reset code sent to your email" });
  } catch (error) {
    console.error("❌ Send reset code error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Verify reset code and update password endpoint
app.post("/make-server-c56dfc7a/reset-password", async (c) => {
  try {
    const { email, code, newPassword } = await c.req.json();

    if (!email || !code || !newPassword) {
      return c.json({ error: "Email, code, and new password are required" }, 400);
    }

    console.log("🔍 Verifying reset code for:", email);

    const storedData = await kv.get(`password_reset:${email}`);

    if (!storedData) {
      console.log("❌ No reset code found for:", email);
      return c.json({ error: "Invalid or expired reset code" }, 400);
    }

    // Check if code matches
    if (storedData.code !== code) {
      console.log("❌ Reset code mismatch for:", email);
      return c.json({ error: "Invalid reset code" }, 400);
    }

    // Check if code is expired
    if (Date.now() > storedData.expiresAt) {
      console.log("❌ Expired reset code for:", email);
      await kv.del(`password_reset:${email}`);
      return c.json({ error: "Reset code has expired" }, 400);
    }

    // Find user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log("❌ User not found:", email);
      return c.json({ error: "User not found" }, 404);
    }

    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("❌ Password update error:", updateError);
      return c.json({ error: "Failed to update password" }, 500);
    }

    // Delete the code after successful reset
    await kv.del(`password_reset:${email}`);

    console.log("✅ Password reset successful for:", email);
    return c.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

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
    "make-c56dfc7a-assignment-files",
    "make-c56dfc7a-stories",
  ];

  for (const bucketName of buckets) {
    const { data: existingBuckets } =
      await supabase.storage.listBuckets();
    const bucketExists = existingBuckets?.some(
      (bucket) => bucket.name === bucketName,
    );

    if (!bucketExists) {
      // Create bucket with public access
      const { data: bucket, error: bucketError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/*', 'video/*'],
        fileSizeLimit: 52428800 // 50MB
      });
      
      if (bucketError) {
        console.error(`Error creating bucket ${bucketName}:`, bucketError);
      } else {
        console.log(`Created public bucket: ${bucketName}`);
      }
    }
  }
}



// Initialize buckets on startup
initializeBuckets();

// UUID validation utility
function isValidUUID(uuid: string | null | undefined): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

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
function ensureUserProfile(profile: any, fallbackId?: string) {
  // Ensure we have a valid ID - check if profile.id exists and is a valid UUID
  let userId = profile?.id;
  if (!userId || userId === "" || !isValidUUID(userId)) {
    userId = fallbackId || "";
  }
  
  return {
    id: userId,
    email: profile?.email || "",
    name: profile?.name || "",
    role: profile?.role || null,
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
    has_temp_password: profile?.has_temp_password || false,
  };
}

// Google Sign up endpoint
app.post("/make-server-c56dfc7a/google-signup", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    console.log("🔐 Google signup: Getting user from token...");
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      console.error("❌ Google signup: Unauthorized - no user from token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    console.log("✅ Google signup: User authenticated:", user.id, user.email);

    const {
      email,
      name,
      avatar_url
    } = await c.req.json();

    console.log("📝 Google signup: Creating profile with data:", {
      userId: user.id,
      email: email || user.email,
      name: name || user.user_metadata?.name || email?.split('@')[0]
    });

    // Store user profile in KV store without a role initially
    const userProfile = ensureUserProfile({
      id: user.id,
      email: email || user.email,
      name: name || user.user_metadata?.name || email?.split('@')[0],
      role: null, // No role assigned yet
      avatar_url: avatar_url || user.user_metadata?.avatar_url,
      status: "active",
      created_at: new Date().toISOString()
    }, user.id); // Pass user.id as fallback

    console.log("🔍 Google signup: Profile after ensureUserProfile:", {
      id: userProfile.id,
      email: userProfile.email,
      name: userProfile.name
    });

    // Validate the profile before storing
    if (!userProfile.id || !isValidUUID(userProfile.id)) {
      console.error("❌ Invalid user ID in Google signup profile:", userProfile.id);
      return c.json({ error: "Invalid user profile data" }, 500);
    }

    await kv.set(`user:${user.id}`, userProfile);

    console.log("✅ Google user profile created successfully:", userProfile.id);
    return c.json({ profile: userProfile });
  } catch (error) {
    console.error("❌ Google signup error:", error);
    return c.json(
      { error: "Internal server error during Google signup" },
      500,
    );
  }
});

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
    }, data.user.id); // Pass user.id as fallback

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
    
    if (!profile) {
      // Profile doesn't exist, return 404 to trigger creation
      console.log("❌ Profile not found for user:", user.id);
      return c.json({ error: "Profile not found" }, 404);
    }
    
    console.log("✅ Profile found for user:", user.id, "Profile data:", profile);
    const safeProfile = ensureUserProfile(profile, user.id);
    
    // Double-check the profile has the correct user ID from auth
    if (!safeProfile.id || safeProfile.id === "" || !isValidUUID(safeProfile.id)) {
      console.log("⚠️ Fixing invalid profile ID. Current:", safeProfile.id, "Setting to:", user.id);
      safeProfile.id = user.id;
    }
    
    // Update last login time
    safeProfile.last_login = new Date().toISOString();
    await kv.set(`user:${user.id}`, safeProfile);
    
    return c.json({ profile: safeProfile });
  } catch (error) {
    console.log("Profile fetch error:", error);
    return c.json({ error: "Error fetching profile" }, 500);
  }
});

// Get all users (for suggestions) - MUST come before /users/:id
app.get("/make-server-c56dfc7a/users/all", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get all users
    const allUsers = await kv.getByPrefix("user:");
    const safeUsers = Array.isArray(allUsers) ? allUsers : [];

    // Map to public profile format
    const publicUsers = safeUsers
      .filter((userProfile: any) => {
        const safeProfile = ensureUserProfile(userProfile, userProfile?.id);
        return safeProfile.id && isValidUUID(safeProfile.id);
      })
      .map((userProfile: any) => {
        const safeProfile = ensureUserProfile(userProfile, userProfile?.id);
        return {
          id: safeProfile.id,
          name: safeProfile.name,
          role: safeProfile.role,
          bio: safeProfile.bio,
          avatar_url: safeProfile.avatar_url,
          followers: safeProfile.followers,
          following: safeProfile.following,
        };
      })
      .slice(0, 100); // Limit to 100 users for performance

    return c.json({ users: publicUsers });
  } catch (error) {
    console.error("Error fetching all users:", error);
    return c.json({ error: "Error fetching users" }, 500);
  }
});

// Get user's following list - MUST come before /users/:id
app.get("/make-server-c56dfc7a/users/:id/following", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const userId = c.req.param("id");
    
    if (!isValidUUID(userId)) {
      return c.json({ error: "Invalid user ID" }, 400);
    }

    const userProfile = await kv.get(`user:${userId}`);
    
    if (!userProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    const safeProfile = ensureUserProfile(userProfile, userId);
    
    // Return following list with user details
    const followingDetails = [];
    for (const followingId of safeProfile.following) {
      if (isValidUUID(followingId)) {
        followingDetails.push({ following_id: followingId });
      }
    }

    return c.json({ following: followingDetails });
  } catch (error) {
    console.error("Error fetching following list:", error);
    return c.json({ error: "Error fetching following list" }, 500);
  }
});

// Follow a user - MUST come before /users/:id
app.post("/make-server-c56dfc7a/users/follow", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { target_user_id } = await c.req.json();
    
    if (!isValidUUID(target_user_id)) {
      return c.json({ error: "Invalid user ID" }, 400);
    }

    const currentUserProfile = await kv.get(`user:${user.id}`);
    const targetUserProfile = await kv.get(`user:${target_user_id}`);

    if (!targetUserProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    const safeCurrentProfile = ensureUserProfile(currentUserProfile, user.id);
    const safeTargetProfile = ensureUserProfile(targetUserProfile, target_user_id);

    // Add to following/followers if not already following
    if (!safeCurrentProfile.following.includes(target_user_id)) {
      safeCurrentProfile.following.push(target_user_id);
      safeTargetProfile.followers.push(user.id);
    }

    await kv.set(`user:${user.id}`, safeCurrentProfile);
    await kv.set(`user:${target_user_id}`, safeTargetProfile);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error following user:", error);
    return c.json({ error: "Error following user" }, 500);
  }
});

// Unfollow a user - MUST come before /users/:id
app.post("/make-server-c56dfc7a/users/unfollow", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { target_user_id } = await c.req.json();
    
    if (!isValidUUID(target_user_id)) {
      return c.json({ error: "Invalid user ID" }, 400);
    }

    const currentUserProfile = await kv.get(`user:${user.id}`);
    const targetUserProfile = await kv.get(`user:${target_user_id}`);

    if (!targetUserProfile) {
      return c.json({ error: "User not found" }, 404);
    }

    const safeCurrentProfile = ensureUserProfile(currentUserProfile, user.id);
    const safeTargetProfile = ensureUserProfile(targetUserProfile, target_user_id);

    // Remove from following/followers
    safeCurrentProfile.following = safeCurrentProfile.following.filter(
      (id: string) => id !== target_user_id
    );
    safeTargetProfile.followers = safeTargetProfile.followers.filter(
      (id: string) => id !== user.id
    );

    await kv.set(`user:${user.id}`, safeCurrentProfile);
    await kv.set(`user:${target_user_id}`, safeTargetProfile);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error unfollowing user:", error);
    return c.json({ error: "Error unfollowing user" }, 500);
  }
});

// Get user profile by ID
app.get("/make-server-c56dfc7a/users/:id", async (c) => {
  try {
    const userId = c.req.param("id");
    
    // Validate the user ID is a proper UUID
    if (!isValidUUID(userId)) {
      console.error("Invalid user ID:", userId);
      return c.json({ error: "Invalid user ID format" }, 400);
    }
    
    const profile = await kv.get(`user:${userId}`);

    if (!profile) {
      return c.json({ error: "User not found" }, 404);
    }

    // Ensure profile has all required fields and return safe public profile
    const safeProfile = ensureUserProfile(profile, userId);
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

    const query = c.req.query("q")?.toLowerCase() || c.req.query("query")?.toLowerCase() || "";
    
    if (!query || query.length < 2) {
      return c.json({ users: [] });
    }

    // Get all users but limit search for performance
    const allUsers = await kv.getByPrefix("user:");
    
    // Limit processing to prevent timeouts
    const limitedUsers = Array.isArray(allUsers) ? allUsers.slice(0, 1000) : [];

    const filteredUsers = limitedUsers
      .filter((userProfile: any) => {
        try {
          const safeProfile = ensureUserProfile(userProfile, userProfile?.id);
          // Only search by name for performance
          return safeProfile.name.toLowerCase().includes(query);
        } catch (err) {
          return false;
        }
      })
      .slice(0, 20) // Limit results
      .map((userProfile: any) => {
        const safeProfile = ensureUserProfile(userProfile, userProfile?.id);
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
      ensureUserProfile(currentProfile, user.id);

    const updatedProfile = {
      ...safeCurrentProfile,
      ...updates,
      id: user.id, // Ensure ID never gets overwritten
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
      
      // Validate the target user ID is a proper UUID
      if (!isValidUUID(targetUserId)) {
        console.error("Invalid target user ID:", targetUserId);
        return c.json({ error: "Invalid user ID format" }, 400);
      }
      
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
        user.id,
      );
      const safeTargetProfile = ensureUserProfile(
        targetUserProfile,
        targetUserId,
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

    const { content, images = [], video = null, background_color = null, type, recipe_data } = await c.req.json();
    const postId = crypto.randomUUID();

    // Get user profile to include avatar
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile);

    const post: any = {
      id: postId,
      content,
      images: Array.isArray(images) ? images : [],
      video: video || null,                // ✅ include video
      background_color: background_color,  // ✅ include background color
      author_id: user.id,
      author_name: user.user_metadata.name || safeUserProfile.name,
      author_role: user.user_metadata.role || safeUserProfile.role,
      author_avatar: safeUserProfile.avatar_url,
      created_at: new Date().toISOString(),
      likes: [],
      comments: [],
      ratings: [],
    };
    

    // Add recipe-specific fields if this is a recipe post
    if (type === "recipe" && recipe_data) {
      post.type = "recipe";
      post.recipe_data = recipe_data;
    }

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
    
    // Validate the user ID is a proper UUID
    if (!isValidUUID(userId)) {
      console.error("Invalid user ID:", userId);
      return c.json({ error: "Invalid user ID format" }, 400);
    }
    
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

// Rate a recipe post
app.post("/make-server-c56dfc7a/posts/:id/rate", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const postId = c.req.param("id");
    const { rating } = await c.req.json();

    // Validate rating
    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return c.json({ error: "Rating must be between 1 and 5" }, 400);
    }

    const post = await kv.get(`post:${postId}`);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    // Only allow rating recipe posts
    if (post.type !== "recipe") {
      return c.json({ error: "Can only rate recipe posts" }, 400);
    }

    // Ensure ratings array exists
    if (!Array.isArray(post.ratings)) {
      post.ratings = [];
    }

    // Get user profile for name
    const userProfile = await kv.get(`user:${user.id}`);
    const userName = userProfile?.name || user.user_metadata?.name || "Anonymous";

    // Remove existing rating from this user if any
    post.ratings = post.ratings.filter((r: any) => r.user_id !== user.id);

    // Add new rating
    const newRating = {
      user_id: user.id,
      user_name: userName,
      rating,
      created_at: new Date().toISOString(),
    };

    post.ratings.push(newRating);

    // Update average rating in recipe_data
    if (post.recipe_data && post.ratings.length > 0) {
      const sum = post.ratings.reduce((acc: number, r: any) => acc + r.rating, 0);
      post.recipe_data.rating = sum / post.ratings.length;
    }

    await kv.set(`post:${postId}`, post);

    return c.json({ post });
  } catch (error) {
    console.log("Post rating error:", error);
    return c.json({ error: "Error rating post" }, 500);
  }
});

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

    // Limit to prevent timeouts - only get last 50 conversations
    const limitedConversationIds = safeUserConversationIds.slice(-50);

    for (const convId of limitedConversationIds) {
      try {
        const conversation = await kv.get(
          `conversation:${convId}`,
        );
        if (conversation) {
          // Get participant info
          const otherParticipantId =
            conversation.participants.find(
              (id: string) => id !== user.id,
            );
          
          if (otherParticipantId) {
            const participantProfile = await kv.get(
              `user:${otherParticipantId}`,
            );
            const safeParticipantProfile = ensureUserProfile(
              participantProfile,
              otherParticipantId
            );

            conversation.participant = {
              id: safeParticipantProfile.id,
              name: safeParticipantProfile.name,
              avatar_url: safeParticipantProfile.avatar_url,
            };
            conversations.push(conversation);
          }
        }
      } catch (convError) {
        console.log(`Error loading conversation ${convId}:`, convError);
        // Continue with other conversations
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

      // Get sender profile for name
      const senderProfile = await kv.get(`user:${user.id}`);
      const safeSenderProfile = ensureUserProfile(senderProfile, user.id);
      
      const message = {
        id: crypto.randomUUID(),
        content,
        sender_id: user.id,
        sender_name: safeSenderProfile.name || user.user_metadata?.name || 'Unknown User',
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

      // Ensure messages array exists
      if (!Array.isArray(conversation.messages)) {
        conversation.messages = [];
      }
      
      return c.json({ conversation });
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

// Get users (admin and instructor)
app.get("/make-server-c56dfc7a/users", async (c) => {
  try {
    const accessToken = c.req
      .header("Authorization")
      ?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || (user.user_metadata.role !== "admin" && user.user_metadata.role !== "instructor")) {
      return c.json(
        { error: "Unauthorized - Admin/Instructor access required" },
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
    
    // Update in Deno KV
    await kv.set(`user:${targetUserId}`, safeTargetProfile);

    // Update in Supabase Auth user_metadata
    const { error: authError } = await supabase.auth.admin.updateUserById(
      targetUserId,
      { 
        user_metadata: { 
          ...safeTargetProfile,
          role: role,
          name: safeTargetProfile.name
        } 
      }
    );

    if (authError) {
      console.error("Error updating auth metadata:", authError);
      // Continue anyway - KV is updated
    }

    console.log(`Admin ${user.user_metadata.name} changed user ${safeTargetProfile.name} role to ${role} (both KV and Auth)`);

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

// Admin/Instructor endpoint: Update user status
app.put("/make-server-c56dfc7a/admin/users/:id/status", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || (user.user_metadata.role !== "admin" && user.user_metadata.role !== "instructor")) {
      return c.json({ error: "Unauthorized - Admin/Instructor access required" }, 403);
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
    
    // Instructors can only update student status
    if (user.user_metadata.role === "instructor" && safeTargetProfile.role !== "student") {
      return c.json({ error: "Instructors can only update student accounts" }, 403);
    }
    
    safeTargetProfile.status = status;
    
    await kv.set(`user:${targetUserId}`, safeTargetProfile);

    console.log(`${user.user_metadata.role} ${user.user_metadata.name} changed user ${safeTargetProfile.name} status to ${status}`);

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
    console.log("Status update error:", error);
    return c.json({ error: "Error updating user status" }, 500);
  }
});

// Admin/Instructor endpoint: Delete user
app.delete("/make-server-c56dfc7a/admin/users/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || (user.user_metadata.role !== "admin" && user.user_metadata.role !== "instructor")) {
      return c.json({ error: "Unauthorized - Admin/Instructor access required" }, 403);
    }

    const targetUserId = c.req.param("id");

    // Prevent deleting yourself
    if (targetUserId === user.id) {
      return c.json({ error: "Cannot delete your own account" }, 400);
    }

    // Get user profile for logging and validation
    const targetProfile = await kv.get(`user:${targetUserId}`);
    if (!targetProfile) {
      return c.json({ error: "User not found" }, 404);
    }
    
    const targetEmail = targetProfile?.email || "unknown";
    const targetName = targetProfile?.name || "unknown";
    const targetRole = targetProfile?.role || "unknown";
    
    // Instructors can only delete student accounts
    if (user.user_metadata.role === "instructor" && targetRole !== "student") {
      return c.json({ error: "Instructors can only delete student accounts" }, 403);
    }

    // Delete from Deno KV
    await kv.del(`user:${targetUserId}`);
    console.log(`Deleted user from KV: ${targetName} (${targetEmail})`);

    // Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId);
    
    if (authError) {
      console.error("Error deleting from Supabase Auth:", authError);
      return c.json({ 
        error: "User deleted from KV but failed to delete from Auth", 
        details: authError.message 
      }, 500);
    }

    console.log(`${user.user_metadata.role} ${user.user_metadata.name} deleted user ${targetName} (${targetEmail}) from both KV and Auth`);

    return c.json({ 
      success: true, 
      message: `User ${targetName} deleted successfully from both KV and Auth`
    });
  } catch (error) {
    console.log("Delete user error:", error);
    return c.json({ error: "Error deleting user" }, 500);
  }
});

// Admin/Instructor endpoint: Create user manually with temporary password
app.post("/make-server-c56dfc7a/admin/create-user", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || (user.user_metadata.role !== "admin" && user.user_metadata.role !== "instructor")) {
      return c.json({ error: "Unauthorized - Admin/Instructor access required" }, 403);
    }

    const { email, name, role } = await c.req.json();

    // Validate inputs
    if (!email || !name || !role) {
      return c.json({ error: "Email, name, and role are required" }, 400);
    }

    if (!["student", "instructor", "admin"].includes(role)) {
      return c.json({ error: "Invalid role" }, 400);
    }
    
    // Instructors can only create student accounts
    if (user.user_metadata.role === "instructor" && role !== "student") {
      return c.json({ error: "Instructors can only create student accounts" }, 403);
    }

    if (!email.toLowerCase().endsWith("@asiancollege.edu.ph")) {
      return c.json({ error: "Use Asian College Email" }, 400);
    }

    // Generate temporary password (8 characters)
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      user_metadata: { name, role },
      email_confirm: true,
    });

    if (error) {
      console.error("Error creating user in Auth:", error);
      return c.json({ error: `Failed to create user: ${error.message}` }, 400);
    }

    // Store user profile in KV with temp password flag
    const userProfile = ensureUserProfile({
      id: data.user.id,
      email,
      name,
      role,
      status: "active",
      created_at: new Date().toISOString(),
      has_temp_password: true, // Flag for forced password change
    }, data.user.id);

    await kv.set(`user:${data.user.id}`, userProfile);

    console.log(`Admin ${user.user_metadata.name} created user ${name} (${email}) with role ${role}`);

    return c.json({
      success: true,
      user: {
        id: data.user.id,
        email,
        name,
        role,
      },
      temporaryPassword: tempPassword,
      message: "User created successfully. Share this temporary password with the user.",
    });
  } catch (error) {
    console.log("Admin create user error:", error);
    return c.json({ error: "Error creating user" }, 500);
  }
});

// Admin/Instructor endpoint: Send invitation email
app.post("/make-server-c56dfc7a/admin/send-invitation", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || (user.user_metadata.role !== "admin" && user.user_metadata.role !== "instructor")) {
      return c.json({ error: "Unauthorized - Admin/Instructor access required" }, 403);
    }

    const { email, role } = await c.req.json();

    // Validate inputs
    if (!email || !role) {
      return c.json({ error: "Email and role are required" }, 400);
    }

    if (!["student", "instructor", "admin"].includes(role)) {
      return c.json({ error: "Invalid role" }, 400);
    }
    
    // Instructors can only send invitations for student accounts
    if (user.user_metadata.role === "instructor" && role !== "student") {
      return c.json({ error: "Instructors can only invite students" }, 403);
    }

    if (!email.toLowerCase().endsWith("@asiancollege.edu.ph")) {
      return c.json({ error: "Use Asian College Email" }, 400);
    }

    // Generate invitation token (secure random string)
    const invitationToken = crypto.randomUUID();

    // Store invitation in KV with 7 days expiration
    await kv.set(`invitation:${invitationToken}`, {
      email,
      role,
      invitedBy: user.id,
      invitedByName: user.user_metadata.name,
      timestamp: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    console.log("🔑 Generated invitation token for:", email);

    // Create invitation link
    const invitationLink = `https://ac-whiskv2.vercel.app/set-password?token=${invitationToken}`;

    // Send email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ACWhisk <ryan.ziga@medprohealth.net>",
        to: [email],
        subject: "You're invited to join ACWhisk!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c9885;">Welcome to ACWhisk!</h2>
            <p>You have been invited to join ACWhisk as a <strong>${role}</strong> by ${user.user_metadata.name}.</p>
            <p>To complete your registration, please click the button below to set your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="background-color: #7c9885; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">Set Your Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; word-break: break-all; font-size: 14px;">${invitationLink}</p>
            <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">ACWhisk - Your Culinary Community Platform</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Resend API error:", error);
      return c.json({ error: "Failed to send invitation email" }, 500);
    }

    console.log(`✅ Admin ${user.user_metadata.name} sent invitation to ${email} for role ${role}`);

    return c.json({
      success: true,
      message: "Invitation email sent successfully",
      invitationLink, // Return for admin to see/copy if needed
    });
  } catch (error) {
    console.log("Admin send invitation error:", error);
    return c.json({ error: "Error sending invitation" }, 500);
  }
});

// Complete invitation and set password endpoint
app.post("/make-server-c56dfc7a/complete-invitation", async (c) => {
  try {
    const { token, password, name } = await c.req.json();

    if (!token || !password || !name) {
      return c.json({ error: "Token, password, and name are required" }, 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters long" }, 400);
    }

    // Get invitation data
    const invitationData = await kv.get(`invitation:${token}`);

    if (!invitationData) {
      return c.json({ error: "Invalid or expired invitation" }, 400);
    }

    // Check if invitation is expired
    if (Date.now() > invitationData.expiresAt) {
      await kv.del(`invitation:${token}`);
      return c.json({ error: "This invitation has expired" }, 400);
    }

    const { email, role } = invitationData;

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true,
    });

    if (error) {
      console.error("Error creating user from invitation:", error);
      return c.json({ error: `Failed to create account: ${error.message}` }, 400);
    }

    // Store user profile in KV
    const userProfile = ensureUserProfile({
      id: data.user.id,
      email,
      name,
      role,
      status: "active",
      created_at: new Date().toISOString(),
    }, data.user.id);

    await kv.set(`user:${data.user.id}`, userProfile);

    // Delete the invitation token
    await kv.del(`invitation:${token}`);

    console.log(`User ${name} (${email}) completed invitation and created account with role ${role}`);

    return c.json({
      success: true,
      message: "Account created successfully! You can now sign in.",
    });
  } catch (error) {
    console.log("Complete invitation error:", error);
    return c.json({ error: "Error completing invitation" }, 500);
  }
});

// Admin-only endpoint: Get all pending invitations
app.get("/make-server-c56dfc7a/admin/invitations", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || (user.user_metadata.role !== "admin" && user.user_metadata.role !== "instructor")) {
      return c.json({ error: "Unauthorized - Admin/Instructor access required" }, 403);
    }

    // Get all invitation tokens from KV with keys
    const allInvitations = await kv.getByPrefixWithKeys("invitation:");
    
    // Format invitation data for display
    const invitations = allInvitations.map((item: any) => ({
      token: item.key.replace("invitation:", ""),
      email: item.value.email,
      role: item.value.role,
      invitedBy: item.value.invitedByName || "Unknown",
      sentAt: new Date(item.value.timestamp).toISOString(),
      expiresAt: new Date(item.value.expiresAt).toISOString(),
      isExpired: Date.now() > item.value.expiresAt,
    }));

    return c.json({ invitations });
  } catch (error) {
    console.log("Error fetching invitations:", error);
    return c.json({ error: "Error fetching invitations" }, 500);
  }
});

// Admin-only endpoint: Delete/Cancel an invitation
app.delete("/make-server-c56dfc7a/admin/invitations/:token", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || (user.user_metadata.role !== "admin" && user.user_metadata.role !== "instructor")) {
      return c.json({ error: "Unauthorized - Admin/Instructor access required" }, 403);
    }

    const token = c.req.param("token");
    
    // Delete the invitation
    await kv.del(`invitation:${token}`);
    
    console.log(`Admin ${user.user_metadata.name} cancelled invitation token ${token}`);

    return c.json({ success: true, message: "Invitation cancelled successfully" });
  } catch (error) {
    console.log("Error cancelling invitation:", error);
    return c.json({ error: "Error cancelling invitation" }, 500);
  }
});

// Admin-only endpoint: Resend invitation
app.post("/make-server-c56dfc7a/admin/invitations/:token/resend", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user || (user.user_metadata.role !== "admin" && user.user_metadata.role !== "instructor")) {
      return c.json({ error: "Unauthorized - Admin/Instructor access required" }, 403);
    }

    const token = c.req.param("token");
    
    // Get current invitation data
    const invitationData = await kv.get(`invitation:${token}`);
    
    if (!invitationData) {
      return c.json({ error: "Invitation not found" }, 404);
    }

    const { email, role } = invitationData;
    
    // Update expiration time
    const updatedInvitation = {
      ...invitationData,
      timestamp: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
    };
    
    await kv.set(`invitation:${token}`, updatedInvitation);

    // Create invitation link
    const invitationLink = `https://ac-whiskv2.vercel.app/set-password?token=${token}`;

    // Resend email via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ACWhisk <ryan.ziga@medprohealth.net>",
        to: [email],
        subject: "Reminder: You're invited to join ACWhisk!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c9885;">Welcome to ACWhisk!</h2>
            <p>This is a reminder that you have been invited to join ACWhisk as a <strong>${role}</strong> by ${user.user_metadata.name}.</p>
            <p>To complete your registration, please click the button below to set your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="background-color: #7c9885; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block;">Set Your Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; word-break: break-all; font-size: 14px;">${invitationLink}</p>
            <p style="color: #666; font-size: 14px;">This invitation link will expire in 7 days.</p>
            <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">ACWhisk - Your Culinary Community Platform</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Resend API error:", error);
      return c.json({ error: "Failed to resend invitation email" }, 500);
    }

    console.log(`✅ Admin ${user.user_metadata.name} resent invitation to ${email}`);

    return c.json({
      success: true,
      message: "Invitation resent successfully",
    });
  } catch (error) {
    console.log("Error resending invitation:", error);
    return c.json({ error: "Error resending invitation" }, 500);
  }
});

// User endpoint: Change password (and remove temp password flag)
app.post("/make-server-c56dfc7a/change-password", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { newPassword } = await c.req.json();

    if (!newPassword || newPassword.length < 6) {
      return c.json({ error: "Password must be at least 6 characters long" }, 400);
    }

    // Update password in Supabase Auth
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (error) {
      console.error("Error updating password:", error);
      return c.json({ error: `Failed to update password: ${error.message}` }, 400);
    }

    // Get user profile and remove temp password flag
    const userProfile = await kv.get(`user:${user.id}`);
    
    if (userProfile && userProfile.has_temp_password) {
      const updatedProfile = { ...userProfile, has_temp_password: false };
      await kv.set(`user:${user.id}`, updatedProfile);
    }

    console.log(`User ${user.user_metadata.name} changed their password`);

    return c.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.log("Change password error:", error);
    return c.json({ error: "Error changing password" }, 500);
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

    const query = c.req.query("query")?.toLowerCase() || "";
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

// Search posts
app.get("/make-server-c56dfc7a/posts/search", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const query = c.req.query("query")?.toLowerCase() || "";
    
    if (query.trim().length < 2) {
      return c.json({ posts: [] });
    }

    const allPosts = await kv.getByPrefix("post:") || [];
    
    const filteredPosts = allPosts
      .filter((post: any) => 
        post.content?.toLowerCase().includes(query) ||
        post.author?.name?.toLowerCase().includes(query)
      )
      .map((post: any) => ({
        id: post.id,
        content: post.content,
        author: post.author,
        created_at: post.created_at,
        images: Array.isArray(post.images) ? post.images : [],
        likes: Array.isArray(post.likes) ? post.likes.length : 0,
        comments: Array.isArray(post.comments) ? post.comments.length : 0
      }))
      .sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10); // Limit to 10 results

    return c.json({ posts: filteredPosts });
  } catch (error) {
    console.log("Error searching posts:", error);
    return c.json({ error: "Error searching posts" }, 500);
  }
});

// Search assignments
app.get("/make-server-c56dfc7a/assignments/search", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const query = c.req.query("query")?.toLowerCase() || "";
    
    if (query.trim().length < 2) {
      return c.json({ assignments: [] });
    }

    const allAssignments = await kv.getByPrefix("assignment:") || [];
    
    const filteredAssignments = allAssignments
      .filter((assignment: any) => 
        assignment.title?.toLowerCase().includes(query) ||
        assignment.description?.toLowerCase().includes(query) ||
        assignment.created_by?.name?.toLowerCase().includes(query)
      )
      .map((assignment: any) => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        created_by: assignment.created_by,
        due_date: assignment.due_date,
        created_at: assignment.created_at,
        status: assignment.status
      }))
      .sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 10); // Limit to 10 results

    return c.json({ assignments: filteredAssignments });
  } catch (error) {
    console.log("Error searching assignments:", error);
    return c.json({ error: "Error searching assignments" }, 500);
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

// ================== NOTIFICATION ENDPOINTS ==================

// Get user notifications
app.get("/make-server-c56dfc7a/notifications", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const limit = parseInt(c.req.query("limit") || "50");

    // Call the Supabase function to get notifications
    const { data: notifications, error } = await supabase
      .rpc('get_user_notifications', { 
        user_uuid: user.id,
        limit_count: limit 
      });

    if (error) {
      console.error("Error fetching notifications:", error);
      return c.json({ error: "Error fetching notifications" }, 500);
    }

    return c.json({ notifications: notifications || [] });
  } catch (error) {
    console.error("Notification fetch error:", error);
    return c.json({ error: "Error loading notifications" }, 500);
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

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id); // Ensure user can only update their own notifications

    if (error) {
      console.error("Error updating notification:", error);
      return c.json({ error: "Error updating notification" }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Notification update error:", error);
    return c.json({ error: "Error updating notification" }, 500);
  }
});

// Mark all notifications as read
app.put("/make-server-c56dfc7a/notifications/mark-all-read", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return c.json({ error: "Error updating notifications" }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Notification bulk update error:", error);
    return c.json({ error: "Error updating notifications" }, 500);
  }
});

// Delete notification
app.delete("/make-server-c56dfc7a/notifications/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const notificationId = c.req.param("id");

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id); // Ensure user can only delete their own notifications

    if (error) {
      console.error("Error deleting notification:", error);
      return c.json({ error: "Error deleting notification" }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Notification delete error:", error);
    return c.json({ error: "Error deleting notification" }, 500);
  }
});

// Get unread notification count
app.get("/make-server-c56dfc7a/notifications/unread-count", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data: count, error } = await supabase
      .rpc('get_unread_notification_count', { user_uuid: user.id });

    if (error) {
      console.error("Error fetching unread count:", error);
      return c.json({ error: "Error fetching unread count" }, 500);
    }

    return c.json({ count: count || 0 });
  } catch (error) {
    console.error("Unread count error:", error);
    return c.json({ error: "Error fetching unread count" }, 500);
  }
});

// Mark conversation notifications as read
app.put("/make-server-c56dfc7a/notifications/conversation/:conversationId", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const conversationId = c.req.param("conversationId");

    const { error } = await supabase
      .rpc('mark_conversation_notifications_read', {
        conv_uuid: conversationId,
        user_uuid: user.id
      });

    if (error) {
      console.error("Error marking conversation notifications as read:", error);
      return c.json({ error: "Error updating notifications" }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Conversation notifications update error:", error);
    return c.json({ error: "Error updating notifications" }, 500);
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

    const userIdParam = c.req.query("user_id");
    const userId = userIdParam || user.id;

    // Validate the user ID is a proper UUID
    if (!isValidUUID(userId)) {
      console.error("Invalid user ID:", userId);
      return c.json({ error: "Invalid user ID format" }, 400);
    }
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

// Stories endpoints
// Create story
app.post("/make-server-c56dfc7a/stories/create", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      console.error("Stories: Unauthorized - no user from token");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { type, media_url, text_content, background_color, duration } = await c.req.json();

    // Get user profile for avatar
    const userProfile = await kv.get(`user:${user.id}`);
    const safeUserProfile = ensureUserProfile(userProfile, user.id);

    const storyId = crypto.randomUUID();
    const story = {
      id: storyId,
      user_id: user.id,
      user_name: safeUserProfile.name,
      user_avatar: safeUserProfile.avatar_url,
      type, // 'image', 'video', or 'text'
      media_url: media_url || '',
      text_content: text_content || '',
      background_color: background_color || '#8B5CF6',
      duration: duration || 5,
      views: [],
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    await kv.set(`story:${storyId}`, story);

    // Add to user's stories list
    const userStories = (await kv.get(`user_stories:${user.id}`)) || [];
    const safeUserStories = Array.isArray(userStories) ? userStories : [];
    safeUserStories.unshift(storyId);
    await kv.set(`user_stories:${user.id}`, safeUserStories);

    console.log(`✅ Story created: ${storyId} by ${user.id}`);
    return c.json({ story });
  } catch (error) {
    console.error("Story creation error:", error);
    return c.json(
      { error: `Story creation failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      500
    );
  }
});

// Get stories list with following users
app.get("/make-server-c56dfc7a/stories/list", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get current user profile for following list
    const currentUserProfile = await kv.get(`user:${user.id}`);
    const safeCurrentProfile = ensureUserProfile(currentUserProfile, user.id);
    const followingIds = Array.isArray(safeCurrentProfile.following) ? safeCurrentProfile.following : [];

    // Get all active stories
    const allStories = await kv.getByPrefix("story:");
    const safeStories = Array.isArray(allStories) ? allStories : [];
    
    // Filter out expired stories
    const now = new Date();
    const activeStories = safeStories.filter((story: any) => {
      const expiresAt = new Date(story.expires_at);
      return expiresAt > now;
    });

    // Check if current user has a story
    const userStories = activeStories.filter((story: any) => story.user_id === user.id);
    const userHasStory = userStories.length > 0;

    // Create a map of user stories
    const storiesByUser = activeStories.reduce((acc: any, story: any) => {
      if (!acc[story.user_id]) {
        acc[story.user_id] = [];
      }
      acc[story.user_id].push(story);
      return acc;
    }, {});

    // Build story groups for following users (whether they have stories or not)
    const storyGroups = [];

    // First add current user if they have stories
    if (userHasStory) {
      const userProfile = safeCurrentProfile;
      const stories = storiesByUser[user.id] || [];
      const hasUnviewed = stories.some((s: any) => !s.views.includes(user.id));
      
      storyGroups.push({
        user_id: user.id,
        user_name: userProfile.name,
        user_avatar: userProfile.avatar_url || '',
        stories: stories.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        has_unviewed: hasUnviewed,
        has_story: true
      });
    }

    // Then add following users
    for (const followingId of followingIds) {
      if (!isValidUUID(followingId)) continue;

      const followingProfile = await kv.get(`user:${followingId}`);
      if (!followingProfile) continue;

      const safeFollowingProfile = ensureUserProfile(followingProfile, followingId);
      const stories = storiesByUser[followingId] || [];
      const hasStory = stories.length > 0;
      const hasUnviewed = stories.some((s: any) => !s.views.includes(user.id));

      storyGroups.push({
        user_id: followingId,
        user_name: safeFollowingProfile.name,
        user_avatar: safeFollowingProfile.avatar_url || '',
        stories: stories.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        has_unviewed: hasUnviewed,
        has_story: hasStory
      });
    }

    // Sort: users with unviewed stories first, then by most recent story
    storyGroups.sort((a: any, b: any) => {
      if (a.has_unviewed && !b.has_unviewed) return -1;
      if (!a.has_unviewed && b.has_unviewed) return 1;
      if (a.stories.length > 0 && b.stories.length > 0) {
        return new Date(b.stories[0].created_at).getTime() - new Date(a.stories[0].created_at).getTime();
      }
      if (a.stories.length > 0) return -1;
      if (b.stories.length > 0) return 1;
      return 0;
    });

    return c.json({ 
      story_groups: storyGroups,
      user_has_story: userHasStory 
    });
  } catch (error) {
    console.error("Stories list fetch error:", error);
    return c.json({ error: "Error fetching stories" }, 500);
  }
});

// Get all active stories
app.get("/make-server-c56dfc7a/stories", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get all stories
    const allStories = await kv.getByPrefix("story:");
    const safeStories = Array.isArray(allStories) ? allStories : [];
    
    // Filter out expired stories and group by user
    const now = new Date();
    const activeStories = safeStories.filter((story: any) => {
      const expiresAt = new Date(story.expires_at);
      return expiresAt > now;
    });

    // Group stories by user
    const storiesByUser = activeStories.reduce((acc: any, story: any) => {
      if (!acc[story.user_id]) {
        acc[story.user_id] = {
          user_id: story.user_id,
          user_name: story.user_name,
          user_avatar: story.user_avatar,
          stories: [],
        };
      }
      acc[story.user_id].stories.push(story);
      return acc;
    }, {});

    // Convert to array and sort by most recent story
    const groupedStories = Object.values(storiesByUser).sort((a: any, b: any) => {
      const aLatest = new Date(a.stories[0].created_at).getTime();
      const bLatest = new Date(b.stories[0].created_at).getTime();
      return bLatest - aLatest;
    });

    return c.json({ stories: groupedStories });
  } catch (error) {
    console.error("Stories fetch error:", error);
    return c.json({ error: "Error fetching stories" }, 500);
  }
});

// View story (track view)
app.post("/make-server-c56dfc7a/stories/:id/view", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const storyId = c.req.param("id");
    const story = await kv.get(`story:${storyId}`);

    if (!story) {
      return c.json({ error: "Story not found" }, 404);
    }

    // Add view if not already viewed
    if (!Array.isArray(story.views)) {
      story.views = [];
    }

    if (!story.views.includes(user.id)) {
      story.views.push(user.id);
      await kv.set(`story:${storyId}`, story);
    }

    return c.json({ story });
  } catch (error) {
    console.error("Story view error:", error);
    return c.json({ error: "Error viewing story" }, 500);
  }
});

// Delete story
app.delete("/make-server-c56dfc7a/stories/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const storyId = c.req.param("id");
    const story = await kv.get(`story:${storyId}`);

    if (!story) {
      return c.json({ error: "Story not found" }, 404);
    }

    if (story.user_id !== user.id) {
      return c.json({ error: "Unauthorized - Not your story" }, 403);
    }

    // Remove from stories
    await kv.del(`story:${storyId}`);

    // Remove from user's stories list
    const userStories = (await kv.get(`user_stories:${user.id}`)) || [];
    const updatedUserStories = userStories.filter((id: string) => id !== storyId);
    await kv.set(`user_stories:${user.id}`, updatedUserStories);

    return c.json({ success: true });
  } catch (error) {
    console.error("Story deletion error:", error);
    return c.json({ error: "Error deleting story" }, 500);
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

// Admin Analytics API
app.get("/make-server-c56dfc7a/admin/analytics", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const user = await getUserFromToken(accessToken!);

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if user is admin
    const userProfile = await kv.get(`user:${user.id}`);
    const safeProfile = ensureUserProfile(userProfile, user.id);
    
    if (safeProfile.role !== "admin") {
      return c.json({ error: "Forbidden - Admin access required" }, 403);
    }

    console.log("📊 Fetching admin analytics...");

    // Get all users
    const allUsers = await kv.getByPrefix("user:");
    const safeUsers = Array.isArray(allUsers) ? allUsers : [];

    // Get all posts
    const allPosts = await kv.getByPrefix("post:");
    const safePosts = Array.isArray(allPosts) ? allPosts : [];

    // Get all conversations (messages)
    const allConversations = await kv.getByPrefix("conversation:");
    const safeConversations = Array.isArray(allConversations) ? allConversations : [];

    // Count total messages
    let totalMessages = 0;
    for (const conv of safeConversations) {
      if (conv.messages && Array.isArray(conv.messages)) {
        totalMessages += conv.messages.length;
      }
    }

    // Calculate user statistics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const newUsersToday = safeUsers.filter((u: any) => {
      const created = new Date(u.created_at || 0);
      return created >= todayStart;
    }).length;

    const activeUsersLast24h = safeUsers.filter((u: any) => {
      const lastLogin = new Date(u.last_login || 0);
      return lastLogin >= last24Hours;
    }).length;

    const recipesPostedToday = safePosts.filter((p: any) => {
      const created = new Date(p.created_at || 0);
      return created >= todayStart;
    }).length;

    // Count messages in last hour
    let messagesLastHour = 0;
    for (const conv of safeConversations) {
      if (conv.messages && Array.isArray(conv.messages)) {
        messagesLastHour += conv.messages.filter((msg: any) => {
          const msgTime = new Date(msg.timestamp || 0);
          return msgTime >= lastHour;
        }).length;
      }
    }

    // User distribution by role
    const usersByRole: Record<string, number> = {};
    safeUsers.forEach((u: any) => {
      const role = u.role || "student";
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });

    const userDistribution = [
      { name: "Students", value: usersByRole.student || 0, color: "#3b82f6" },
      { name: "Instructors", value: usersByRole.instructor || 0, color: "#8b5cf6" },
      { name: "Admins", value: usersByRole.admin || 0, color: "#f59e0b" }
    ];

    // User growth data (last 7 days)
    const userGrowth = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const usersOnDay = safeUsers.filter((u: any) => {
        const created = new Date(u.created_at || 0);
        return created >= dayStart && created < dayEnd;
      });

      const students = usersOnDay.filter((u: any) => u.role === "student").length;
      const instructors = usersOnDay.filter((u: any) => u.role === "instructor").length;
      const total = usersOnDay.length;

      userGrowth.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        students,
        instructors,
        total
      });
    }

    // Recipe activity (last 7 days)
    const recipeActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const postsOnDay = safePosts.filter((p: any) => {
        const created = new Date(p.created_at || 0);
        return created >= dayStart && created < dayEnd;
      });

      const posted = postsOnDay.length;
      const viewed = postsOnDay.reduce((sum: number, p: any) => sum + (p.views || 0), 0);
      const rated = postsOnDay.reduce((sum: number, p: any) => sum + (p.ratings?.length || 0), 0);

      recipeActivity.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        posted,
        viewed,
        rated
      });
    }

    // Platform activity (last 7 days)
    const platformActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      let messagesOnDay = 0;
      for (const conv of safeConversations) {
        if (conv.messages && Array.isArray(conv.messages)) {
          messagesOnDay += conv.messages.filter((msg: any) => {
            const msgTime = new Date(msg.timestamp || 0);
            return msgTime >= dayStart && msgTime < dayEnd;
          }).length;
        }
      }

      platformActivity.push({
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        messages: messagesOnDay,
        assignments: Math.floor(Math.random() * 10), // Placeholder
        submissions: Math.floor(Math.random() * 15) // Placeholder
      });
    }

    // Top recipe categories
    const categoryCount: Record<string, number> = {};
    safePosts.forEach((p: any) => {
      const category = p.category || "Uncategorized";
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCount)
      .map(([name, posts]) => ({ name, posts: posts as number }))
      .sort((a, b) => b.posts - a.posts)
      .slice(0, 5)
      .map((cat, index) => ({
        ...cat,
        color: ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6"][index] || "#6b7280"
      }));

    // If no categories, provide defaults
    if (topCategories.length === 0) {
      topCategories.push(
        { name: "Asian Cuisine", posts: 0, color: "#ef4444" },
        { name: "Desserts", posts: 0, color: "#f59e0b" },
        { name: "Main Course", posts: 0, color: "#3b82f6" },
        { name: "Appetizers", posts: 0, color: "#10b981" },
        { name: "Beverages", posts: 0, color: "#8b5cf6" }
      );
    }

    const analytics = {
      stats: {
        totalUsers: safeUsers.length,
        totalRecipes: safePosts.length,
        totalMessages: totalMessages,
        activeUsers: activeUsersLast24h,
        newUsersToday,
        recipesPostedToday,
        messagesLastHour,
        systemHealth: 98.5
      },
      chartData: {
        userGrowth,
        recipeActivity,
        userDistribution,
        platformActivity,
        topCategories
      }
    };

    console.log("✅ Analytics fetched successfully");
    return c.json(analytics);
  } catch (error) {
    console.error("❌ Admin analytics error:", error);
    return c.json({ error: "Error fetching analytics" }, 500);
  }
});

Deno.serve(app.fetch);