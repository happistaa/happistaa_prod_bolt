'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, fetchAndUpdateUserProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Get redirect path from URL if present
  const redirectParam = searchParams.get('redirect') || '/dashboard';
  
  // Ensure the redirect path is properly formatted
  const redirectPath = redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Sign in with Supabase via our hook
      const { data: signInData, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        throw signInError;
      }
      
      // For backward compatibility with existing code
      localStorage.setItem('isAuthenticated', 'true');
      
      // If user signed in successfully
      if (signInData?.user?.id) {
        // First check if user has a completed profile in Supabase
        const userProfile = await fetchAndUpdateUserProfile(signInData.user.id);
        
        if (userProfile) {
          console.log("User profile found, completedSetup:", userProfile.completedSetup);
          console.log("Support type:", userProfile.supportType);
          
          // Normalize support type if needed
          if (userProfile.supportType === "I need support") {
            userProfile.supportType = "support-seeker";
            console.log("Normalized support type to support-seeker");
            // Update localStorage with correct format
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
            localStorage.setItem('supportType', 'support-seeker');
          } else if (userProfile.supportType === "I want to provide support") {
            userProfile.supportType = "support-giver";
            console.log("Normalized support type to support-giver");
            // Update localStorage with correct format
            localStorage.setItem('userProfile', JSON.stringify(userProfile));
            localStorage.setItem('supportType', 'support-giver');
          }
          
          // Check if the user has completed their profile setup
          if (userProfile.completedSetup) {
            console.log("User has completed profile setup, redirecting to:", redirectPath);
            // User has completed setup, redirect to the intended destination
            router.push(redirectPath);
            return;
          }
          
          // Check if there's any localStorage data that needs to be synced
          const hasLocalStorageData = localStorage.getItem('userProfile') || 
                                     localStorage.getItem('supportType') || 
                                     localStorage.getItem('selectedJourneys') ||
                                     localStorage.getItem('journeyNote');
          
          if (hasLocalStorageData) {
            console.log("User has localStorage data, redirecting to profile setup for sync");
            // Redirect to profile setup with sync parameter
            router.push('/onboarding/profile-setup?sync=true');
          } else {
            console.log("User needs to complete profile setup");
            // User needs to complete their profile
            router.push('/onboarding/profile-setup');
          }
        } else {
          console.log("No user profile found, redirecting to profile setup");
          // No profile found, redirect to profile setup
          router.push('/onboarding/profile-setup');
        }
      } else {
        console.log("No user ID found in sign-in data, redirecting to dashboard");
        // Fallback to dashboard if no user ID
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Sign In</h1>
        
        {redirectPath && redirectPath !== '/dashboard' && (
          <div className="mb-6 p-3 bg-blue-50 text-blue-800 rounded-lg">
            <p className="text-sm">
              Sign in to continue to {redirectPath.replace(/^\//g, '').replace(/-/g, ' ')}
            </p>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-800 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded-full"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                Remember me
              </label>
            </div>
            
            <button 
              type="button" 
              className="text-sm text-blue-600 hover:text-blue-500"
              onClick={() => router.push('/auth/forgot-password')}
            >
              Forgot password?
            </button>
          </div>
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full py-6 text-lg bg-blue-500 hover:bg-blue-600 transition-all duration-300 rounded-full"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button 
              className="text-blue-600 hover:text-blue-500 rounded-full"
              onClick={() => {
                // Preserve the redirect parameter when going to signup
                const redirect = searchParams.get('redirect');
                router.push(redirect ? `/auth/signup?redirect=${redirect}` : '/auth/signup');
              }}
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
} 