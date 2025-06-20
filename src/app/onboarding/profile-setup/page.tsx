'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import ProfileSetup from '@/components/profile/ProfileSetup';

export default function ProfileSetupPage() {
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  
  useEffect(() => {
    // If there's a redirect parameter, save it for after profile setup is complete
    if (redirectPath) {
      localStorage.setItem('redirectAfterProfileSetup', redirectPath);
    }
  }, [redirectPath]);
  
  return <ProfileSetup />;
} 