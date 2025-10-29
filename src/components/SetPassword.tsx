import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import logoImage from 'figma:asset/868eb8cd441d8d76debd4a1fae08c51899b81cd8.png';

interface SetPasswordProps {
  onNavigate: (page: string) => void;
}

export function SetPassword({ onNavigate }: SetPasswordProps) {
  const [token, setToken] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Get token from URL query parameters
    const params = new URLSearchParams(window.location.search);
    const invitationToken = params.get('token');
    if (invitationToken) {
      setToken(invitationToken);
    } else {
      setError('No invitation token provided');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-c56dfc7a/complete-invitation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            password: formData.password,
            name: formData.name,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          onNavigate('landing');
        }, 2000);
      } else {
        setError(data.error || 'Failed to complete registration');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4">
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 animate-pulse blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-gradient-to-br from-accent/15 to-primary/10 animate-pulse blur-3xl" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 post-card p-8 max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-3 rounded-full mb-4 border border-primary/20">
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
            <h2 className="text-2xl font-bold text-foreground mb-4">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">
              The invitation link is invalid or missing. Please check the link in your email.
            </p>
            <button
              onClick={() => onNavigate('landing')}
              className="btn-gradient px-6 py-3 rounded-lg font-medium"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-4">
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 animate-pulse blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-gradient-to-br from-accent/15 to-primary/10 animate-pulse blur-3xl" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative z-10 post-card p-8 max-w-md w-full">
          <div className="text-center">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-3 rounded-full mb-4 border border-primary/20">
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
            <h2 className="text-2xl font-bold text-foreground mb-4">Account Created!</h2>
            <p className="text-muted-foreground mb-6">
              Your account has been successfully created. Redirecting you to login...
            </p>
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-gradient-to-br from-primary/15 to-accent/10 animate-pulse blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-gradient-to-br from-accent/15 to-primary/10 animate-pulse blur-3xl" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/8 to-accent/8 animate-pulse blur-3xl" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md mx-auto animate-fade-in">
          <div className="post-card p-8 shadow-xl">
            {/* Logo */}
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
                Complete Your Registration
              </h2>
              <p className="text-muted-foreground">
                Set your password to activate your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-clean w-full px-4 py-3"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-clean w-full px-4 py-3"
                  placeholder="Enter your password"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 8 characters long
                </p>
              </div>

              <div>
                <label className="block text-foreground text-sm font-medium mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="input-clean w-full px-4 py-3"
                  placeholder="Confirm your password"
                />
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
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  'Complete Registration'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => onNavigate('landing')}
                  className="text-sm text-primary hover:underline"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
