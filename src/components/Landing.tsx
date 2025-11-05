import React, { useState } from "react";
import { ChefHat, X } from "lucide-react";
import { useAuth } from "../App";
import logoImage from "figma:asset/868eb8cd441d8d76debd4a1fae08c51899b81cd8.png";
import { projectId, publicAnonKey } from "../utils/supabase/info";

interface LandingProps {
  onNavigate: (page: string) => void;
}

export function Landing({ onNavigate }: LandingProps) {
  const { login, signup } = useAuth();
  const [activeForm, setActiveForm] = useState<
    "signin" | "signup" | "forgot"
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
            {/* Auth Form */}
            {activeForm === "signin" ? (
              <SignInForm onNavigate={onNavigate} onForgotPassword={() => setActiveForm("forgot")} />
            ) : (
              <ForgotPasswordForm onBack={() => setActiveForm("signin")} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SignInFormProps {
  onNavigate: (page: string) => void;
  onForgotPassword: () => void;
}

function SignInForm({ onNavigate, onForgotPassword }: SignInFormProps) {
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
        // Navigation is handled by App.tsx based on user role
        // Admin users go to 'admin', others go to 'feed'
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

      <div className="mt-4 text-center space-y-2">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-primary hover:underline"
        >
          Forgot Password?
        </button>

      </div>
    </form>
  );
}

interface ForgotPasswordFormProps {
  onBack: () => void;
}

function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [step, setStep] = useState<"email" | "verify" | "success">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {

      if (!email.toLowerCase().endsWith("@asiancollege.edu.ph")) {
        setError("Please use Asian College Email");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/send-reset-code`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (response.ok) {
        setStep("verify");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to send reset code");
      }
    } catch (err) {
      setError("Failed to send reset code");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");


    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }


    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/reset-password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            code,
            newPassword,
          }),
        }
      );

      if (response.ok) {
        setStep("success");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to reset password");
      }
    } catch (err) {
      setError("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/send-reset-code`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || "Failed to resend code");
      }
    } catch (err) {
      setError("Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success") {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-3 rounded-full mb-4 border border-primary/20 shadow-lg">
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
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Password Reset Successful!
          </h2>
          <p className="text-muted-foreground">
            Your password has been updated successfully
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
          <p className="text-foreground">You can now login with your new password</p>
        </div>

        <button
          onClick={onBack}
          className="w-full btn-gradient px-4 py-3 rounded-lg font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Back to Login
        </button>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <form onSubmit={handleResetPassword} className="space-y-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-3 rounded-full mb-4 border border-primary/20 shadow-lg">
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
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Reset Your Password
          </h2>
          <p className="text-muted-foreground">
            Enter the code sent to {email}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-foreground text-sm font-medium mb-2">
              Verification Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="input-clean w-full px-4 py-3 text-center text-2xl tracking-widest"
              placeholder="000000"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-2">
              Code expires in 15 minutes
            </p>
          </div>

          <div>
            <label className="block text-foreground text-sm font-medium mb-2">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-clean w-full px-4 py-3"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label className="block text-foreground text-sm font-medium mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-clean w-full px-4 py-3"
              placeholder="Confirm new password"
            />
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full btn-gradient px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Resetting Password...</span>
              </div>
            ) : (
              "Reset Password"
            )}
          </button>

          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-border hover:bg-secondary"
          >
            ← Change Email
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={loading}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              {loading ? "Sending..." : "Resend Code"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendResetCode} className="space-y-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-3 rounded-full mb-4 border border-primary/20 shadow-lg">
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
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Forgot Password?
        </h2>
        <p className="text-muted-foreground">
          Enter your email to receive a reset code
        </p>
      </div>

      <div>
        <label className="block text-foreground text-sm font-medium mb-2">
          Email Address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-clean w-full px-4 py-3"
          placeholder="Enter your email address"
          autoFocus
        />

      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-gradient px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Sending Code...</span>
            </div>
          ) : (
            "Send Reset Code"
          )}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 border border-border hover:bg-secondary"
        >
          ← Back to Login
        </button>
      </div>
    </form>
  );
}