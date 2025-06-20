'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface Certification {
  file?: string;
  name?: string;
  issueDate?: string;
  status: 'pending' | 'approved' | 'rejected' | 'none';
}

interface UserProfile {
  certificationBackground?: string[];
  certifications?: Certification;
  supportGiver?: boolean;
  supportSeeker?: boolean;
  journeyNote?: string;
}

interface CertificationScreenProps {
  onNext?: () => void;
  onBack?: () => void;
}

export default function CertificationScreen({ onNext, onBack }: CertificationScreenProps) {
  const router = useRouter();
  const [certificationBackground, setCertificationBackground] = useState<string[]>([]);
  const [certificationFile, setCertificationFile] = useState<File | null>(null);
  const [certificationName, setCertificationName] = useState('');
  const [certificationDate, setCertificationDate] = useState('');
  
  // Load existing certification data if available
  useEffect(() => {
    try {
      const userProfileJSON = localStorage.getItem('userProfile');
      if (userProfileJSON) {
        const userProfile: UserProfile = JSON.parse(userProfileJSON);
        
        // Set certification background if available
        if (userProfile.certificationBackground) {
          setCertificationBackground(userProfile.certificationBackground);
        }
        
        // Set certification details if available
        if (userProfile.certifications) {
          setCertificationName(userProfile.certifications.name || '');
          setCertificationDate(userProfile.certifications.issueDate || '');
        }
      }
    } catch (e) {
      console.error('Error loading existing certification data:', e);
    }
  }, []);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCertificationFile(e.target.files[0]);
    }
  };
  
  const toggleCertificationBackground = (option: string) => {
    setCertificationBackground(prev => {
      if (prev.includes(option)) {
        return prev.filter(item => item !== option);
      } else {
        return [...prev, option];
      }
    });
  };
  
  const handleContinue = () => {
    // Get existing profile data
    let profileData: UserProfile = {};
    try {
      const existingData = localStorage.getItem('userProfile');
      if (existingData) {
        profileData = JSON.parse(existingData);
      }
    } catch (e) {
      console.error('Error parsing profile data:', e);
    }
    
    // Prepare certification data
    let certificationData: Certification = {
      status: 'none'
    };
    
    if (certificationFile) {
      certificationData = {
        file: URL.createObjectURL(certificationFile),
        name: certificationName,
        issueDate: certificationDate,
        status: 'pending'
      };
    } else if (certificationName || certificationDate) {
      certificationData = {
        name: certificationName,
        issueDate: certificationDate,
        status: 'pending'
      };
    }
    
    // Update profile with certification data
    const updatedProfile = {
      ...profileData,
      certificationBackground,
      certifications: certificationData,
      // Mark as support giver if not already set
      supportGiver: profileData.supportGiver !== undefined ? profileData.supportGiver : true
    };
    
    // Save updated profile
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    
    // Navigate to next screen or call the provided callback
    if (onNext) {
      onNext();
    } else {
      router.push('/onboarding/community-guidelines');
    }
  };
  
  const backgroundOptions = [
    'Volunteered Before',
    'Studying Psychology',
    'Listener Training',
    'Life Coach',
    'Counseling Experience',
    'Mental Health First Aid',
    'Personal Experience',
    'Other'
  ];
  
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
            Your Qualifications
          </h1>
          <p className="text-lg text-gray-600">
            Since you'll be providing support to others, please share any relevant qualifications or certifications you may have.
          </p>
        </motion.div>

        <div className="bg-white rounded-xl p-8 shadow-sm space-y-6">
          {/* Background options */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Your Background (Select all that apply)
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {backgroundOptions.map((option, i) => (
                <label 
                  key={i} 
                  className={`px-3 py-2 rounded-full border cursor-pointer ${
                    certificationBackground.includes(option)
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={option}
                    checked={certificationBackground.includes(option)}
                    onChange={() => toggleCertificationBackground(option)}
                    className="sr-only"
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
          
          {/* Certification file upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Upload any relevant certifications (optional)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {certificationFile && (
              <div className="text-sm text-green-600">
                File selected: {certificationFile.name}
              </div>
            )}
            <p className="text-xs text-gray-500">
              Upload certification documents to get the "Certified" badge. Our team will review your submission.
            </p>
          </div>
          
          {/* Certification name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Certification Name
            </label>
            <input
              type="text"
              value={certificationName}
              onChange={(e) => setCertificationName(e.target.value)}
              placeholder="e.g., Mental Health First Aid, Life Coach Certification"
              className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Certification date */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Issue Date
            </label>
            <input
              type="date"
              value={certificationDate}
              onChange={(e) => setCertificationDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex justify-between pt-4">
          <Button
            onClick={onBack || (() => router.push('/onboarding/support-preferences'))}
            variant="outline"
            className="rounded-full"
          >
            Back
          </Button>
          
          <Button
            onClick={handleContinue}
            className="bg-blue-500 hover:bg-blue-600 rounded-full"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}