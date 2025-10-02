import React, { useState } from "react";
import { ChefHat, X } from "lucide-react";
import { useAuth } from "../App";
import logoImage from "./assets/868eb8cd441d8d76debd4a1fae08c51899b81cd8.png";

interface LandingProps {
  onNavigate: (page: string) => void;
}

export function Landing({ onNavigate }: LandingProps) {
  const { login, signup } = useAuth();
  const [activeForm, setActiveForm] = useState<
    "signin" | "signup"
  >("signin");

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Beautiful sage green background pattern */}
      <div className="absolute inset-0">
        {/* Floating sage green orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 animate-pulse blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-gradient-to-br from-accent/15 to-primary/10 animate-pulse blur-3xl" style={{ animationDelay: "2s" }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/8 to-accent/8 animate-pulse blur-3xl" style={{ animationDelay: "1s" }}></div>
        
        {/* Additional floating elements */}
        <div className="absolute top-1/4 right-1/3 w-48 h-48 rounded-full bg-gradient-to-tr from-green-200/20 to-emerald-200/15 animate-pulse blur-2xl" style={{ animationDelay: "3s" }}></div>
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 rounded-full bg-gradient-to-bl from-teal-200/15 to-primary/10 animate-pulse blur-2xl" style={{ animationDelay: "4s" }}></div>
        
        {/* Subtle animated lines */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary/30 to-transparent animate-pulse" style={{ animationDelay: "0.5s" }}></div>
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-accent/30 to-transparent animate-pulse" style={{ animationDelay: "1.5s" }}></div>
        </div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto animate-fade-in">
          {/* Clean Instagram-like Container */}
          <div className="post-card p-8 shadow-xl transform hover:scale-[1.02] transition-all duration-500 hover:shadow-2xl backdrop-blur-sm border border-border/50">
            {/* Form Toggle */}
            <div className="flex bg-secondary rounded-xl p-1 mb-8">
              <button
                onClick={() => setActiveForm("signin")}
                className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeForm === "signin"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveForm("signup")}
                className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeForm === "signup"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Auth Form */}
            {activeForm === "signin" ? (
              <SignInForm onNavigate={onNavigate} />
            ) : (
              <SignUpForm onNavigate={onNavigate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SignInFormProps {
  onNavigate: (page: string) => void;
}

function SignInForm({ onNavigate }: SignInFormProps) {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(
        formData.email,
        formData.password,
      );
      if (result.success) {
        onNavigate("feed");
      } else {
        setError(result.error || "Sign in failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-3 rounded-full mb-4 border border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="w-8 h-8 flex items-center justify-center p-1 bg-gradient-to-br from-primary to-accent rounded-full">
            <img
              src={logoImage}
              alt="ACWhisk Logo"
              className="w-full h-full object-contain filter brightness-0 invert"
            />
          </div>
          <span className="text-foreground font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ACWhisk
          </span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2 animate-slide-up">
          Welcome Back
        </h2>
        <p className="text-muted-foreground animate-slide-up" style={{ animationDelay: "0.2s" }}>
          Sign in to continue your culinary journey
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-foreground text-sm font-medium mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({
                ...formData,
                email: e.target.value,
              })
            }
            className="input-clean w-full px-4 py-3"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-foreground text-sm font-medium mb-2">
            Password
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) =>
              setFormData({
                ...formData,
                password: e.target.value,
              })
            }
            className="input-clean w-full px-4 py-3"
            placeholder="Enter your password"
          />
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-gradient px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? "Signing In..." : "Sign In"}
      </button>
    </form>
  );
}

interface SignUpFormProps {
  onNavigate: (page: string) => void;
}

function SignUpForm({ onNavigate }: SignUpFormProps) {
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "student",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signup(
        formData.email,
        formData.password,
        formData.name,
        formData.role,
      );
      if (result.success) {
        onNavigate("feed");
      } else {
        setError(result.error || "Sign up failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-3 rounded-full mb-4 border border-primary/20 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
          <div className="w-8 h-8 flex items-center justify-center p-1 bg-gradient-to-br from-primary to-accent rounded-full">
            <img
              src={logoImage}
              alt="ACWhisk Logo"
              className="w-full h-full object-contain filter brightness-0 invert"
            />
          </div>
          <span className="text-foreground font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ACWhisk
          </span>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2 animate-slide-up">
          Join ACWhisk
        </h2>
        <p className="text-muted-foreground animate-slide-up" style={{ animationDelay: "0.2s" }}>
          Start your culinary adventure today
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-foreground text-sm font-medium mb-2">
            Full Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="input-clean w-full px-4 py-3"
            placeholder="Enter your full name"
          />
        </div>

        <div>
          <label className="block text-foreground text-sm font-medium mb-2">
            Role
          </label>
          <select
            value={formData.role}
            onChange={(e) =>
              setFormData({ ...formData, role: e.target.value })
            }
            className="input-clean w-full px-4 py-3"
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-foreground text-sm font-medium mb-2">
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({
                ...formData,
                email: e.target.value,
              })
            }
            className="input-clean w-full px-4 py-3"
            placeholder="Enter your email"
          />
        </div>

        <div>
          <label className="block text-foreground text-sm font-medium mb-2">
            Password
          </label>
          <input
            type="password"
            required
            value={formData.password}
            onChange={(e) =>
              setFormData({
                ...formData,
                password: e.target.value,
              })
            }
            className="input-clean w-full px-4 py-3"
            placeholder="Enter your password"
          />
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-gradient px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? "Creating Account..." : "Create Account"}
      </button>
    </form>
  );
}