'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Experience {
  id: string;
  title: string;
  selected: boolean;
}

interface JourneyScreenProps {
  onNext?: () => void;
}

// Use the same journey options as in ProfileSetup
const journeyOptions = [
  'Stress', 
  'Anxiety', 
  'Depression', 
  'Relationship Issues',
  'Career Challenges',
  'Academic Pressure',
  'Family Issues',
  'Health & Wellness',
  'Work-Life Balance',
  'Parenthood',
  'Heartbreak',
  'Loneliness',
  'Mental Health'
];

export default function JourneyScreen({ onNext }: JourneyScreenProps) {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>(
    journeyOptions.map(option => ({
      id: option.toLowerCase().replace(/\s+/g, '-'),
      title: option,
      selected: false
    }))
  );

  const toggleExperience = (id: string) => {
    setExperiences(prev =>
      prev.map(exp =>
        exp.id === id ? { ...exp, selected: !exp.selected } : exp
      )
    );
  };

  const handleContinue = () => {
    const selectedExperiences = experiences.filter(e => e.selected);
    
    if (selectedExperiences.length > 0) {
      // Store selected journeys in local storage
      const selectedJourneys = selectedExperiences.map(exp => exp.title);
      
      // Try to get existing profile data
      let profileData = {};
      try {
        const existingData = localStorage.getItem('userProfile');
        if (existingData) {
          profileData = JSON.parse(existingData);
        }
      } catch (e) {
        console.error('Error parsing profile data:', e);
      }
      
      // Update profile with selected journeys
      const updatedProfile = {
        ...profileData,
        journey: selectedJourneys[0], // Primary journey (first selected)
        supportPreferences: selectedJourneys // All selected journeys
      };
      
      // Save updated profile
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      // Also save selected journeys separately for easier access
      localStorage.setItem('selectedJourneys', JSON.stringify(selectedJourneys));
      
      if (onNext) {
        onNext();
      } else {
        router.push('/onboarding/community-guidelines');
      }
    }
  };

  const hasSelection = experiences.some(exp => exp.selected);

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
            Share Your Journey
          </h1>
          <p className="text-lg text-gray-600">
            Life has its ups and downs. Let us know what experiences you&apos;ve been through, and we&apos;ll help you connect with the right people.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {experiences.map((experience, index) => (
            <motion.div
              key={experience.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              onClick={() => toggleExperience(experience.id)}
              className={`p-4 rounded-full cursor-pointer transition-all duration-300 h-full ${
                experience.selected
                  ? 'bg-primary/10 border-2 border-primary'
                  : 'bg-white border-2 border-gray-100 hover:border-primary/20'
              } flex items-center justify-center`}
            >
              <span className="text-gray-800 text-center">{experience.title}</span>
            </motion.div>
          ))}
        </div>

        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-primary/10 p-4 rounded-lg border border-primary/20"
          >
            <p className="text-gray-700 text-sm">
              You&apos;re not alone—many have been here too and found their way forward. Let&apos;s find your people.
            </p>
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col space-y-4 pt-6"
        >
          <Button
            onClick={handleContinue}
            className="w-full py-6 text-lg rounded-full"
            disabled={!hasSelection}
          >
            Continue
          </Button>
          <Button
            onClick={() => router.push('/onboarding/support-preferences')}
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