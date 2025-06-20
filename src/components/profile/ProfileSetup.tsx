'use client';

import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  name: string
  dateOfBirth: string
  location: string
  gender: string
  workplace: string
  jobTitle: string
  education: string
  religiousBeliefs: string
  communicationPreferences: string
  availability: string
  completedSetup: boolean
  profileCompletionPercentage: number
  journey?: string
  journeyNote?: string
  supportPreferences?: string[]
  supportType?: string
  certificationBackground?: string[]
  certifications?: {
    file?: string
    name?: string
    issueDate?: string
    status: 'pending' | 'approved' | 'rejected' | 'none'
  }
}

interface Field {
  name: string
  label: string
  type: string
  required: boolean
  options?: string[]
  category: 'mandatory' | 'optional'
}

interface Step {
  id: string
  title: string
  fields: Field[]
  category: 'mandatory' | 'optional'
}

// Only keep mandatory steps in the main setup flow
const steps: Step[] = [
  {
    id: 'name',
    title: 'Set Your Username',
    category: 'mandatory',
    fields: [
      { name: 'name', label: 'User Name', type: 'text', required: true, category: 'mandatory' }
    ]
  },
  {
    id: 'dob',
    title: 'Date of Birth',
    category: 'mandatory',
    fields: [
      { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true, category: 'mandatory' }
    ]
  },
  {
    id: 'location',
    title: 'Location',
    category: 'mandatory',
    fields: [
      { name: 'location', label: 'City', type: 'text', required: true, category: 'mandatory' }
    ]
  },
  {
    id: 'gender',
    title: 'Gender',
    category: 'mandatory',
    fields: [
      { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'], required: true, category: 'mandatory' }
    ]
  }
];

// Optional fields info for reference (not part of the main setup)
const optionalFields = [
  { name: 'workplace', label: 'Workplace', type: 'text', required: false, category: 'optional' },
  { name: 'jobTitle', label: 'Job Title', type: 'text', required: false, category: 'optional' },
  { name: 'education', label: 'Education Level', type: 'select', options: ['High School', 'Bachelor\'s Degree', 'Master\'s Degree', 'PhD', 'Other'], required: false, category: 'optional' },
  { name: 'religiousBeliefs', label: 'Religious Beliefs', type: 'select', options: ['Christianity', 'Islam', 'Hinduism', 'Buddhism', 'Judaism', 'Other', 'None', 'Prefer not to say'], required: false, category: 'optional' },
  { name: 'communicationPreferences', label: 'Preferred Communication Method', type: 'select', options: ['Text Chat', 'Voice Call', 'Video Call', 'Any'], required: false, category: 'optional' },
  { name: 'availability', label: 'Preferred Time for Support', type: 'select', options: ['Morning', 'Afternoon', 'Evening', 'Night', 'Flexible'], required: false, category: 'optional' }
];

// Add journey options
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

// Add additional steps for journey and support preferences
const additionalSteps: Step[] = [
  {
    id: 'supportType',
    title: 'Support Type',
    category: 'optional',
    fields: [
      { 
        name: 'supportType', 
        label: 'Choose your role in the community', 
        type: 'radio', 
        options: ['I want to provide support', 'I need support'],
        required: false, 
        category: 'optional' 
      },
      { 
        name: 'journeyNote', 
        label: 'Share your brief personal journey', 
        type: 'textarea',
        required: false, 
        category: 'optional',
      }
    ]
  },
  {
    id: 'journeyPreferences',
    title: 'Your Journey',
    category: 'optional',
    fields: [
      { 
        name: 'supportPreferences', 
        label: 'What areas are you comfortable discussing?', 
        type: 'multiselect', 
        options: journeyOptions,
        required: false, 
        category: 'optional' 
      }
    ]
  },
  {
    id: 'certification',
    title: 'Your Qualifications',
    category: 'optional',
    fields: [
      { 
        name: 'certificationBackground', 
        label: 'Your Background (Select all that apply)', 
        type: 'multiselect', 
        options: [
          'Volunteered Before',
          'Studying Psychology',
          'Listener Training',
          'Life Coach',
          'Counseling Experience',
          'Mental Health First Aid',
          'Personal Experience',
          'Other'
        ],
        required: false, 
        category: 'optional' 
      },
      { 
        name: 'certificationFile', 
        label: 'Upload any relevant certifications (optional)', 
        type: 'file', 
        required: false, 
        category: 'optional' 
      },
      { 
        name: 'certificationName', 
        label: 'Certification Name', 
        type: 'text', 
        required: false, 
        category: 'optional' 
      },
      { 
        name: 'certificationDate', 
        label: 'Issue Date', 
        type: 'date', 
        required: false, 
        category: 'optional' 
      }
    ]
  }
];

// Combine all steps
const allSteps = [...steps, ...additionalSteps];

// Calculate total number of fields for percentage calculation
const totalFields = allSteps.reduce((acc, step) => acc + step.fields.length, 0);
const mandatoryFields = steps.reduce((acc, step) => acc + step.fields.length, 0);

interface ProfileSetupProps {
  onComplete?: (profileData: UserProfile) => void;
}

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldSync = searchParams.get('sync') === 'true'
  const [currentStep, setCurrentStep] = useState(0)
  const [profileData, setProfileData] = useState<UserProfile>({
    id: '',
    name: '',
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
    journeyNote: '',
    supportPreferences: [],
    supportType: '',
    certificationBackground: [],
    certifications: {
      status: 'none'
    }
  })
  const [showOptionalSteps, setShowOptionalSteps] = useState(false)
  const [certificationFile, setCertificationFile] = useState<File | null>(null)
  const [showCelebrationModal, setShowCelebrationModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Add ref to track if profile has been loaded
  const profileLoadedRef = useRef(false);

  // Load profile data from Supabase or localStorage
  useEffect(() => {
    // If profile already loaded and no sync requested, don't reload
    if (profileLoadedRef.current && !shouldSync) {
      return;
    }
    
    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("User is authenticated, checking for profile data");
          
          // First check if we need to sync localStorage data with Supabase
          if (shouldSync) {
            console.log("Syncing localStorage data with Supabase");
            await syncLocalStorageWithSupabase(session.user.id);
          }
          
          // Fetch profile from Supabase
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (error) {
            console.error('Error fetching profile from Supabase:', error);
            // Fallback to localStorage if Supabase fetch fails
            loadFromLocalStorage();
          } else if (profile) {
            console.log("Profile found in Supabase:", profile);
            console.log("Profile completed_setup status:", profile.completed_setup);
            
            // If user has already completed setup and is not explicitly syncing data,
            // redirect to dashboard
            if (profile.completed_setup && !shouldSync) {
              console.log("User has already completed setup, redirecting to dashboard");
              router.push('/dashboard');
              return;
            }
            
            // Map Supabase profile to our application profile structure
            const mappedProfile: UserProfile = {
              id: profile.id || '',
              name: profile.name || '',
              dateOfBirth: profile.dob || '',
              location: profile.location || '',
              gender: profile.gender || '',
              workplace: profile.workplace || '',
              jobTitle: profile.job_title || '',
              education: profile.education || '',
              religiousBeliefs: profile.religious_beliefs || '',
              communicationPreferences: profile.communication_style || '',
              availability: profile.availability || '',
              completedSetup: profile.completed_setup || false,
              profileCompletionPercentage: calculateProfileCompletionPercentage(profile),
              journey: profile.support_preferences ? profile.support_preferences[0] : '',
              supportPreferences: profile.support_preferences || [],
              supportType: profile.support_type || '',
              journeyNote: profile.journey_note || '',
              certifications: {
                status: 'none'
              }
            };
            
            setProfileData(mappedProfile);
            
            // Save to localStorage for backward compatibility
            localStorage.setItem('userProfile', JSON.stringify(mappedProfile));
            localStorage.setItem('profileSetupCompleted', profile.completed_setup ? 'true' : 'false');
          } else {
            // No profile found in Supabase, fallback to localStorage
            loadFromLocalStorage();
          }
        } else {
          // User is not authenticated, load from localStorage
          loadFromLocalStorage();
        }
        
        // Mark profile as loaded
        profileLoadedRef.current = true;
      } catch (error) {
        console.error("Error loading profile data:", error);
        loadFromLocalStorage();
      } finally {
        setIsLoading(false);
      }
    };
    
    // Helper function to load from localStorage
    const loadFromLocalStorage = () => {
      console.log("Loading profile data from localStorage");
      const storedProfile = localStorage.getItem('userProfile');
      const profileCompleted = localStorage.getItem('profileSetupCompleted');
      
      if (storedProfile) {
        try {
          const parsedProfile = JSON.parse(storedProfile);
          setProfileData(prev => ({
            ...prev,
            ...parsedProfile,
            completedSetup: profileCompleted === 'true'
          }));
        } catch (error) {
          console.error("Error parsing profile from localStorage:", error);
        }
      }
      
      // Load support type if available
      const supportType = localStorage.getItem('supportType');
      if (supportType) {
        setProfileData(prev => ({
          ...prev,
          supportType
        }));
      }
      
      // Load journey preferences if available
      const selectedJourneysJSON = localStorage.getItem('selectedJourneys');
      if (selectedJourneysJSON) {
        try {
          const selectedJourneys = JSON.parse(selectedJourneysJSON);
          if (Array.isArray(selectedJourneys) && selectedJourneys.length > 0) {
            setProfileData(prev => ({
              ...prev,
              supportPreferences: selectedJourneys,
              journey: selectedJourneys[0]
            }));
          }
        } catch (error) {
          console.error("Error parsing selected journeys from localStorage:", error);
        }
      }
      
      // Load journey note if available
      const journeyNote = localStorage.getItem('journeyNote');
      if (journeyNote) {
        setProfileData(prev => ({
          ...prev,
          journeyNote
        }));
      }
    };
    
    // Helper function to sync localStorage with Supabase
    const syncLocalStorageWithSupabase = async (userId: string) => {
      try {
        // Get data from localStorage
        const storedProfile = localStorage.getItem('userProfile');
        const supportType = localStorage.getItem('supportType');
        const selectedJourneysJSON = localStorage.getItem('selectedJourneys');
        const journeyNote = localStorage.getItem('journeyNote');
        
        if (!storedProfile && !supportType && !selectedJourneysJSON && !journeyNote) {
          console.log("No localStorage data to sync");
          return;
        }
        
        console.log("Syncing localStorage data with Supabase");
        
        // Prepare data to update or insert
        const updateData: any = {
          id: userId,
          updated_at: new Date().toISOString()
        };
        
        // Add data from localStorage profile if available
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          
          // Map profile data to database fields
          if (parsedProfile.name) updateData.name = parsedProfile.name;
          if (parsedProfile.dateOfBirth) updateData.dob = parsedProfile.dateOfBirth;
          if (parsedProfile.location) updateData.location = parsedProfile.location;
          if (parsedProfile.gender) updateData.gender = parsedProfile.gender;
          if (parsedProfile.workplace) updateData.workplace = parsedProfile.workplace;
          if (parsedProfile.jobTitle) updateData.job_title = parsedProfile.jobTitle;
          if (parsedProfile.education) updateData.education = parsedProfile.education;
          if (parsedProfile.religiousBeliefs) updateData.religious_beliefs = parsedProfile.religiousBeliefs;
          if (parsedProfile.communicationPreferences) updateData.communication_style = parsedProfile.communicationPreferences;
          if (parsedProfile.availability) updateData.availability = parsedProfile.availability;
          if (parsedProfile.supportPreferences) updateData.support_preferences = parsedProfile.supportPreferences;
          if (parsedProfile.journeyNote) updateData.journey_note = parsedProfile.journeyNote;
          if (parsedProfile.supportType) updateData.support_type = parsedProfile.supportType;
          if (parsedProfile.completedSetup !== undefined) updateData.completed_setup = parsedProfile.completedSetup;
        }
        
        // Add support type if available
        if (supportType) {
          updateData.support_type = supportType;
        }
        
        // Add selected journeys if available
        if (selectedJourneysJSON) {
          try {
            const selectedJourneys = JSON.parse(selectedJourneysJSON);
            if (Array.isArray(selectedJourneys) && selectedJourneys.length > 0) {
              updateData.support_preferences = selectedJourneys;
            }
          } catch (error) {
            console.error("Error parsing selected journeys:", error);
          }
        }
        
        // Add journey note if available
        if (journeyNote) {
          updateData.journey_note = journeyNote;
        }
        
        // First check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', userId)
          .single();
          
        if (fetchError) {
          console.log("No profile found, creating new profile");
          
          // Include created_at for new profiles
          updateData.created_at = new Date().toISOString();
          
          // Create new profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(updateData);
            
          if (insertError) {
            console.error('Error creating profile in Supabase:', insertError);
          } else {
            console.log("Successfully created profile in Supabase");
            // Clear localStorage after successful sync
            clearLocalStorageData();
          }
        } else {
          console.log("Updating existing profile");
          // Update existing profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);
            
          if (updateError) {
            console.error('Error updating profile in Supabase:', updateError);
          } else {
            console.log("Successfully updated profile in Supabase");
            // Clear localStorage after successful sync
            clearLocalStorageData();
          }
        }
      } catch (error) {
        console.error("Error syncing localStorage data with Supabase:", error);
      }
    };
    
    // Helper function to clear localStorage data after syncing with Supabase
    const clearLocalStorageData = () => {
      // Keep isAuthenticated flag but clear profile data
      localStorage.removeItem('supportType');
      localStorage.removeItem('selectedJourneys');
      localStorage.removeItem('journeyNote');
      console.log("Cleared localStorage data after syncing with Supabase");
    };
    
    // Helper function to calculate profile completion percentage
    const calculateProfileCompletionPercentage = (profile: any): number => {
      const fields = [
        'name', 'dob', 'location', 'gender', 'workplace', 'job_title', 
        'education', 'religious_beliefs', 'communication_style', 'availability'
      ];
      
      let filledCount = 0;
      let totalFields = fields.length;
      
      fields.forEach(field => {
        if (profile[field]) filledCount++;
      });
      
      return Math.round((filledCount / totalFields) * 100);
    };
    
    loadProfileData();
  }, [shouldSync, router]); // Add router to dependency array

  const handleInputChange = (name: string, value: string | boolean | string[]) => {
    setProfileData(prev => {
      const updatedData = {
      ...prev,
      [name]: value
      };
      
      // Handle support type selection
      if (name === 'supportType') {
        if (value === 'I want to provide support') {
          updatedData.supportType = 'support-giver';
          // Also save to localStorage directly for immediate access
          localStorage.setItem('supportType', 'support-giver');
          console.log("Updated support type to support-giver");
        } else if (value === 'I need support') {
          updatedData.supportType = 'support-seeker';
          // Also save to localStorage directly for immediate access
          localStorage.setItem('supportType', 'support-seeker');
          console.log("Updated support type to support-seeker");
        } else if (typeof value === 'string') {
          // If value is already in database format, use it directly
          updatedData.supportType = value;
          localStorage.setItem('supportType', value);
          console.log("Using direct support type:", value);
        }
      }
      
      // Special handling for certification file
      if (name === 'certificationFile' && certificationFile) {
        updatedData.certifications = {
          ...updatedData.certifications!,
          file: URL.createObjectURL(certificationFile),
          status: 'pending' as const
        };
      }
      
      // Special handling for certification name
      if (name === 'certificationName') {
        updatedData.certifications = {
          ...updatedData.certifications!,
          name: value as string,
          status: updatedData.certifications?.status || 'none' as const
        };
      }
      
      // Special handling for certification date
      if (name === 'certificationDate') {
        updatedData.certifications = {
          ...updatedData.certifications!,
          issueDate: value as string,
          status: updatedData.certifications?.status || 'none' as const
        };
      }
      
      // Calculate profile completion percentage
      const filledFields = Object.entries(updatedData).filter(([key, val]) => {
        if (key === 'completedSetup' || key === 'profileCompletionPercentage') {
          return false;
        }
        if (key === 'supportPreferences' && Array.isArray(val)) {
          return val.length > 0;
        }
        if (key === 'certifications' && typeof val === 'object' && val !== null) {
          const cert = val as { file?: string, name?: string, issueDate?: string };
          return cert.file || cert.name || cert.issueDate;
        }
        return val !== '' && val !== false;
      }).length;
      
      const percentage = Math.round((filledFields / totalFields) * 100);
      
      // Also update the localStorage with the new profile data
      localStorage.setItem('userProfile', JSON.stringify({
        ...updatedData,
        profileCompletionPercentage: percentage
      }));
      
      return {
        ...updatedData,
        profileCompletionPercentage: percentage
      };
    });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCertificationFile(e.target.files[0]);
      handleInputChange('certificationFile', true);
    }
  };

  const shouldShowCertificationStep = (currentStep: number) => {
    // Only show certification step if user has selected 'supportGiver'
    if (currentStep === allSteps.findIndex(step => step.id === 'certification')) {
      return profileData.supportType === 'support-giver';
    }
    return true;
  };

  // Determine the next appropriate step based on current selections
  const getNextStep = (currentStep: number) => {
    const nextStep = currentStep + 1;
    
    // Skip certification step if user is not a support giver
    if (nextStep === allSteps.findIndex(step => step.id === 'certification') && profileData.supportType !== 'support-giver') {
      // Return the step after certification or just complete the setup
      return nextStep + 1 < allSteps.length ? nextStep + 1 : -1;
    }
    
    return nextStep < allSteps.length ? nextStep : -1;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (showOptionalSteps) {
      const nextStep = getNextStep(currentStep);
      if (nextStep >= 0) {
        setCurrentStep(nextStep);
      } else {
        completeSetup();
      }
    } else {
      // Check if all mandatory fields are filled
      const mandatoryFieldsFilled = steps.every(step => 
        step.fields.every(field => 
          !field.required || profileData[field.name as keyof UserProfile] !== ''
        )
      );
      
      // All mandatory fields should be filled at this point
      if (!mandatoryFieldsFilled) {
        // If somehow mandatory fields aren't filled, don't proceed
        alert("Please fill all required fields");
        return;
      }
      
      completeSetup();
    }
  };

  const completeSetup = async () => {
    // Save profile data and redirect to dashboard
    const updatedProfileData = {
      ...profileData,
      completedSetup: true // Mark as completed since all mandatory fields are filled
    };
    
    localStorage.setItem('userProfile', JSON.stringify(updatedProfileData));
    localStorage.setItem('profileSetupCompleted', 'true');
    
    // Clear temporary storage used during onboarding
    localStorage.removeItem('selectedJourneys');
    
    // Try to save to Supabase if user is authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("Saving profile data to Supabase from ProfileSetup");
        console.log("Support type being saved:", updatedProfileData.supportType);
        
        // Map the profile data to match Supabase schema
        const supabaseProfileData: Record<string, any> = {
          id: session.user.id,
          name: updatedProfileData.name,
          dob: updatedProfileData.dateOfBirth,
          location: updatedProfileData.location,
          gender: updatedProfileData.gender,
          workplace: updatedProfileData.workplace || null,
          job_title: updatedProfileData.jobTitle || null,
          education: updatedProfileData.education || null,
          religious_beliefs: updatedProfileData.religiousBeliefs || null,
          availability: updatedProfileData.availability || null,
          communication_style: updatedProfileData.communicationPreferences || null,
          support_preferences: updatedProfileData.supportPreferences || [],
          journey_note: updatedProfileData.journeyNote || null,
          completed_setup: true, // Always set to true when completing setup
          support_type: updatedProfileData.supportType || null,
          updated_at: new Date().toISOString()
        };
        
        console.log("Supabase profile data:", supabaseProfileData);
        
        // First check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id, created_at')
          .eq('id', session.user.id)
          .single();
          
        if (fetchError) {
          console.log("No profile found, creating new profile from ProfileSetup");
          
          // Make sure to include created_at if it's a new profile
          supabaseProfileData.created_at = new Date().toISOString();
          
          // Create new profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(supabaseProfileData);
            
          if (insertError) {
            console.error('Error creating profile in Supabase:', insertError);
          } else {
            console.log("Successfully created profile in Supabase with completed_setup=true");
            // Clear localStorage after successful sync
            clearLocalStorageData();
          }
        } else {
          console.log("Updating existing profile from ProfileSetup");
          
          // Preserve the original created_at timestamp
          if (existingProfile.created_at) {
            delete supabaseProfileData.created_at;
          }
          
          // Update existing profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update(supabaseProfileData)
            .eq('id', session.user.id);
            
          if (updateError) {
            console.error('Error updating profile in Supabase:', updateError);
          } else {
            console.log("Successfully updated profile in Supabase with completed_setup=true");
            // Clear localStorage after successful sync
            clearLocalStorageData();
          }
        }
      }
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      // Continue with the flow even if Supabase save fails
    }
    
    // Show celebration modal
    setShowCelebrationModal(true);
    
    // If onComplete callback is provided, call it instead of routing
    if (onComplete) {
      onComplete(updatedProfileData);
      return;
    }
  };

  // Helper function to clear localStorage data after syncing with Supabase
  const clearLocalStorageData = () => {
    // Keep isAuthenticated flag but clear profile data
    localStorage.removeItem('supportType');
    localStorage.removeItem('selectedJourneys');
    localStorage.removeItem('journeyNote');
    console.log("Cleared localStorage data after syncing with Supabase");
  };

  // Function to handle navigation after celebration
  const handleContinueAfterCelebration = () => {
    setShowCelebrationModal(false);
    
    // Check if there's a redirect path stored
    const redirectPath = localStorage.getItem('redirectAfterProfileSetup');
    if (redirectPath) {
      localStorage.removeItem('redirectAfterProfileSetup');
      
      // Handle paths properly whether they start with a slash or not
      const formattedPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
      router.push(formattedPath);
    } else {
      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
    setCurrentStep(prev => prev - 1)
  }
  }

  const isStepValid = () => {
    return currentStepData.fields.every(field => 
      !field.required || profileData[field.name as keyof UserProfile] !== ''
    );
  }

  const handleCompleteBasicProfile = async () => {
    // Check if all mandatory fields are filled
    const mandatoryFieldsFilled = steps.every(step => 
      step.fields.every(field => 
        !field.required || profileData[field.name as keyof UserProfile] !== ''
      )
    );
    
    if (!mandatoryFieldsFilled) {
      alert("Please fill all required fields");
      return;
    }
    
    // Save profile data
    const updatedProfileData = {
      ...profileData,
      completedSetup: true // Mark as completed since all mandatory fields are filled
    };
    
    localStorage.setItem('userProfile', JSON.stringify(updatedProfileData));
    localStorage.setItem('profileSetupCompleted', 'true');
    
    // Clear temporary storage used during onboarding
    localStorage.removeItem('selectedJourneys');
    
    // Try to save to Supabase if user is authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("Saving basic profile data to Supabase from ProfileSetup");
        
        // Map the profile data to match Supabase schema
        const supabaseProfileData: Record<string, any> = {
          id: session.user.id,
          name: updatedProfileData.name,
          dob: updatedProfileData.dateOfBirth,
          location: updatedProfileData.location,
          gender: updatedProfileData.gender,
          workplace: updatedProfileData.workplace || null,
          job_title: updatedProfileData.jobTitle || null,
          education: updatedProfileData.education || null,
          religious_beliefs: updatedProfileData.religiousBeliefs || null,
          availability: updatedProfileData.availability || null,
          communication_style: updatedProfileData.communicationPreferences || null,
          support_preferences: updatedProfileData.supportPreferences || [],
          journey_note: updatedProfileData.journeyNote || null,
          completed_setup: true, // Always set to true when completing setup
          support_type: updatedProfileData.supportType || null,
          updated_at: new Date().toISOString()
        };
        
        // First check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();
          
        if (fetchError) {
          console.log("No profile found, creating new profile from ProfileSetup");
          // Include created_at for new profiles
          supabaseProfileData.created_at = new Date().toISOString();
          
          // Create new profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(supabaseProfileData);
            
          if (insertError) {
            console.error('Error creating profile in Supabase:', insertError);
          } else {
            console.log("Successfully created profile in Supabase with completed_setup=true");
            // Clear localStorage after successful sync
            clearLocalStorageData();
          }
        } else {
          console.log("Updating existing profile from ProfileSetup");
          // Update existing profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update(supabaseProfileData)
            .eq('id', session.user.id);
            
          if (updateError) {
            console.error('Error updating profile in Supabase:', updateError);
          } else {
            console.log("Successfully updated profile in Supabase with completed_setup=true");
            // Clear localStorage after successful sync
            clearLocalStorageData();
          }
        }
      }
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      // Continue with the flow even if Supabase save fails
    }
    
    // Show celebration modal
    setShowCelebrationModal(true);
  }

  const currentStepData = currentStep < steps.length 
    ? steps[currentStep] 
    : allSteps[currentStep];
  
  const isLastMandatoryStep = currentStep === steps.length - 1;
  const isLastStep = currentStep === allSteps.length - 1;
  const isMandatoryStep = currentStep < steps.length;

  // Render function for different field types
  const renderField = (field: Field) => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={profileData[field.name as keyof UserProfile] as string || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={field.label}
            required={field.required}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={profileData[field.name as keyof UserProfile] as string || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={field.required}
          />
        );
      case 'select':
        return (
          <select
            value={profileData[field.name as keyof UserProfile] as string || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option, i) => (
              <option key={i} value={option}>{option}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={!!profileData[field.name as keyof UserProfile]}
              onChange={(e) => handleInputChange(field.name, e.target.checked)}
              className="w-5 h-5 text-blue-500 rounded-full focus:ring-blue-500"
            />
            <span>{field.label}</span>
          </label>
        );
      case 'radio':
        return (
          <div className="space-y-3">
            {field.options?.map((option, i) => (
              <label key={i} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  checked={field.name === 'supportType' ? (option === 'I want to provide support' ? profileData.supportType === 'support-giver' : profileData.supportType === 'support-seeker') : profileData[field.name as keyof UserProfile] === option}
                  onChange={(e) => {
                    const currentType = profileData.supportType || '';
                    const newType = e.target.checked
                      ? option === 'I want to provide support' ? 'support-giver' : 'support-seeker'
                      : currentType === 'support-giver' ? 'support-seeker' : 'support-giver';
                    handleInputChange('supportType', newType);
                  }}
                  className="w-5 h-5 text-blue-500 focus:ring-blue-500"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      case 'multiselect':
        if (field.name === 'supportPreferences') {
          return (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 mt-2">
                {field.options?.map((option, i) => (
                  <label 
                    key={i} 
                    className={`px-3 py-2 rounded-full border cursor-pointer ${
                      profileData.supportPreferences?.includes(option)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={option}
                      checked={profileData.supportPreferences?.includes(option) || false}
                      onChange={(e) => {
                        const currentPrefs = profileData.supportPreferences || [];
                        const newPrefs = e.target.checked
                          ? [...currentPrefs, option]
                          : currentPrefs.filter(p => p !== option);
                        handleInputChange('supportPreferences', newPrefs);
                      }}
                      className="sr-only"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          );
        } else if (field.name === 'certificationBackground') {
          return (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 mt-2">
                {field.options?.map((option, i) => (
                  <label 
                    key={i} 
                    className={`px-3 py-2 rounded-full border cursor-pointer ${
                      profileData.certificationBackground?.includes(option)
                        ? 'bg-green-100 border-green-300 text-green-700'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      value={option}
                      checked={profileData.certificationBackground?.includes(option) || false}
                      onChange={(e) => {
                        const currentBg = profileData.certificationBackground || [];
                        const newBg = e.target.checked
                          ? [...currentBg, option]
                          : currentBg.filter((p: string) => p !== option);
                        handleInputChange('certificationBackground', newBg);
                      }}
                      className="sr-only"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          );
        }
        return null;
      case 'file':
        return (
          <div className="space-y-2">
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
        );
      case 'textarea':
        return (
          <textarea
            id={field.name}
            value={(profileData as any)[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            rows={4}
          />
        );
      default:
        return null;
    }
  };

        return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {showOptionalSteps && !isMandatoryStep ? (
          <motion.div 
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-4"
          >
            <h1 className="text-3xl font-bold text-gray-900">
              {currentStepData.title}
            </h1>
            <p className="text-lg text-gray-600">
              Optional Step {currentStep - steps.length + 1} of {additionalSteps.length}
            </p>
          </motion.div>
        ) : (
        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            {currentStepData.title}
          </h1>
          <p className="text-lg text-gray-600">
            Step {currentStep + 1} of {steps.length}
          </p>
        </motion.div>
        )}

        <div className="bg-white rounded-xl p-8 shadow-sm">
          {/* Progress bar at the top */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span>Profile Completion</span>
              <span>{profileData.profileCompletionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-500 h-2.5 rounded-full" 
                style={{ width: `${profileData.profileCompletionPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-6">
            {shouldShowCertificationStep(currentStep) && currentStepData.fields.map((field, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {field.label} {field.required && <span className="text-red-500">*</span>}
                </label>
                {renderField(field)}
            </div>
          ))}
          </div>

          <div className="mt-8 flex justify-between">
          <Button
                onClick={handleBack}
            variant="outline"
            disabled={currentStep === 0}
              >
                Back
          </Button>
              
            {isLastMandatoryStep && !showOptionalSteps ? (
              <div className="space-x-3">
                <Button
                  onClick={handleCompleteBasicProfile}
                  variant="outline"
                >
                  Save and Complete Later
                </Button>
                <Button
                  onClick={() => {
                    setShowOptionalSteps(true);
                    setCurrentStep(steps.length);
                  }}
                  className="bg-blue-500 hover:bg-blue-600 rounded-full"
                >
                  Add More Details
                </Button>
              </div>
            ) : (
          <Button
              onClick={handleNext}
                disabled={!isStepValid()}
                className="bg-blue-500 hover:bg-blue-600 rounded-full"
            >
                {isLastStep ? 'Complete Setup' : 'Next'}
          </Button>
            )}
          </div>
        </div>
      </div>

      {/* Celebration Modal */}
      {showCelebrationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-center">
            <div className="mb-4 text-5xl">🎉</div>
            <h2 className="text-2xl font-bold text-blue-600 mb-4">Welcome to Happistaa!</h2>
            <p className="text-gray-700 mb-6">
              Your profile has been saved. We're excited to have you join our community. 
              Your journey to better mental health starts now!
            </p>
            <Button
              onClick={handleContinueAfterCelebration}
              className="w-full bg-blue-500 hover:bg-blue-600 rounded-full"
            >
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}