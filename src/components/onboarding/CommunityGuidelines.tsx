'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { UserProfile } from '@/components/profile/ProfileSetup';

interface CommunityGuidelinesProps {
  onNext?: () => void;
}

const guidelines = [
  {
    title: "Be Kind and Respectful",
    description: "Treat others with respect and empathy. No harassment, hate speech, or discrimination."
  },
  {
    title: "Maintain Privacy",
    description: "Keep personal information private. Don't share contact details or sensitive information."
  },
  {
    title: "No Medical Advice",
    description: "Share experiences, not medical advice. Always consult professionals for medical decisions."
  },
  {
    title: "Be Supportive",
    description: "Offer support and encouragement. Listen actively and respond with care."
  },
  {
    title: "Report Concerns",
    description: "Report any concerning behavior. We're here to maintain a safe environment."
  }
];

export default function CommunityGuidelinesScreen({ onNext }: CommunityGuidelinesProps) {
  const router = useRouter();

  const handleAgree = () => {
    // Store agreement in localStorage
    localStorage.setItem('guidelinesAccepted', 'true');
    
    // Check if we already have a user profile
    const existingProfile = localStorage.getItem('userProfile');
    
    if (existingProfile) {
      // If we have an existing profile, update the guidelines acceptance
      const profile = JSON.parse(existingProfile);
      
      // Do NOT mark as authenticated here - only store the profile data
      // localStorage.setItem('isAuthenticated', 'true');
      
      // Set profile as partially completed
      const updatedProfile = {
        ...profile,
        completedSetup: false,
        profileCompletionPercentage: profile.profileCompletionPercentage || 25
      };
      
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    } else {
      // Create a minimal user profile with proper typing
      const minimalProfile: UserProfile = {
        id: '',
        name: 'Guest User',
        dateOfBirth: '',
        location: '',
        gender: '',
        workplace: '',
        jobTitle: '',
        education: '',
        religiousBeliefs: '',
        communicationPreferences: '',
        availability: '',
        completedSetup: false,
        profileCompletionPercentage: 0,
        journey: '',
        supportPreferences: [],
        supportType: '',
        certifications: {
          status: 'none'
        }
      };
      
      // Try to get journey and support preferences from local storage
      try {
        const selectedJourneysJSON = localStorage.getItem('selectedJourneys');
        minimalProfile.supportType = localStorage.getItem('supportType') || '';
        if (selectedJourneysJSON) {
          const selectedJourneys = JSON.parse(selectedJourneysJSON);
          minimalProfile.journey = selectedJourneys[0] || '';
          minimalProfile.supportPreferences = selectedJourneys;
        }
      } catch (e) {
        console.error('Error loading selected journeys:', e);
      }
      
      // Store minimal profile data
      localStorage.setItem('userProfile', JSON.stringify(minimalProfile));
      localStorage.setItem('profileSetupCompleted', 'false');
    }
    
    if (onNext) {
      onNext();
    } else {
      // Redirect to dashboard
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Community Guidelines
          </h1>
          <p className="text-lg text-gray-600">
            Help us create a safe and supportive environment
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guidelines.map((guideline, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.15, duration: 0.5 }}
              className="bg-white p-6 rounded-xl soft-shadow card-hover h-full"
            >
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {guideline.title}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {guideline.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col space-y-4 pt-6"
        >
          <Button
            onClick={handleAgree}
            className="w-full py-6 text-lg rounded-full"
          >
            I Agree & Continue
          </Button>
          <Button
            onClick={() => router.push('/onboarding/journey')}
            variant="outline"
            className="w-full py-6 text-lg rounded-full"
          >
            Go Back
          </Button>
        </motion.div>
      </div>
    </div>
  );
} 