'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp } = useAuth();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  useEffect(() => {
    // Get redirect path from URL if present
    const redirect = searchParams.get('redirect');
    if (redirect) {
      setRedirectPath(redirect);
    }
    
    // Get support type from URL if present
    const supportType = searchParams.get('supportType');
    if (supportType === 'support-giver' || supportType === 'support-seeker') {
      localStorage.setItem('supportType', supportType);
    } else if (supportType === 'give') {
      localStorage.setItem('supportType', 'support-giver');
    } else if (supportType === 'need') {
      localStorage.setItem('supportType', 'support-seeker');
    }
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    // Validate password strength
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    
    try {
      // Sign up with Supabase via our hook
      const { data, error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        throw signUpError;
      }
      
      // For backward compatibility with existing code
      localStorage.setItem('isAuthenticated', 'true');
      
      // Store redirect path in localStorage if it exists
      if (redirectPath) {
        localStorage.setItem('redirectAfterProfileSetup', redirectPath);
      }
      
      // Show success message
      setSuccessMessage('Account created successfully! A confirmation email has been sent to your email address. You can proceed with setting up your profile.');
      
      // Redirect to profile setup after a short delay
      setTimeout(() => {
        router.push('/onboarding/profile-setup');
      }, 1500);
      
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md w-full bg-white rounded-xl p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Create Account</h1>
      
      {redirectPath && (
        <div className="mb-6 p-3 bg-blue-50 text-blue-800 rounded-lg">
          <p className="text-sm">
            Sign up to continue to {redirectPath.replace(/-/g, ' ')}
          </p>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-800 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-6 p-3 bg-green-50 text-green-800 rounded-lg">
          <p className="text-sm">{successMessage}</p>
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
            placeholder="Create a password"
            required
          />
        </div>
        
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Confirm your password"
            required
          />
        </div>
        
        <div className="flex items-center">
          <input
            id="terms"
            type="checkbox"
            className="h-4 w-4 text-blue-500 focus:ring-blue-500 border-gray-300 rounded-full"
            required
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
            I agree to the <span className="text-blue-600">Terms of Service</span> and <span className="text-blue-600">Privacy Policy</span>
          </label>
        </div>
        
        <Button
          type="submit"
          disabled={loading}
          className="w-full py-6 text-lg bg-blue-500 hover:bg-blue-600 transition-all duration-300 rounded-full"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button 
            className="text-blue-600 hover:text-blue-500 rounded-full"
            onClick={() => {
              // Preserve the redirect parameter when going to login
              const redirect = searchParams.get('redirect');
              router.push(redirect ? `/auth/login?redirect=${redirect}` : '/auth/login');
            }}
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
