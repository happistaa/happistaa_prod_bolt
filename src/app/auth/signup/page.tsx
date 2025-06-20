import React, { Suspense } from 'react';
import SignupForm from '@/components/auth/SignupForm';

export default function SignupPage() {
  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
} 