'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/components/profile/ProfileSetup';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

// Journey options for dropdown
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

export default function Profile() {
  const router = useRouter();
  const { user, fetchAndUpdateUserProfile, syncProfileWithSupabase } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile>({
    id:'',
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
    supportPreferences: [],
    supportType: '',
    certificationBackground: [],
    certifications: {
      status: 'none'
    },
    journeyNote: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [certificationFile, setCertificationFile] = useState<File | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const profileFetchedRef = useRef(false);
  
  // Helper function to clear localStorage data after syncing with Supabase
  const clearLocalStorageData = () => {
    // Keep isAuthenticated flag but clear profile data
    localStorage.removeItem('supportType');
    localStorage.removeItem('selectedJourneys');
    localStorage.removeItem('journeyNote');
    console.log("Cleared localStorage data after fetching from Supabase");
  };

  useEffect(() => {
    // If profile already fetched, don't fetch again
    if (profileFetchedRef.current) {
      return;
    }
    
    async function fetchProfile() {
      setIsLoading(true);
      console.log("Fetching profile data in Profile component...");
      
      try {
        // Get the current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("User session found in Profile component:", session.user.id);
          setIsAuthenticated(true);
          
          // Use fetchAndUpdateUserProfile from useAuth hook
          const profile = await fetchAndUpdateUserProfile(session.user.id);
          
          if (profile) {
            console.log("Profile fetched successfully:", profile);
            console.log("Profile completedSetup status:", profile.completedSetup);
            
            setProfileData(profile);
            
            // Clear localStorage after successful fetch
            clearLocalStorageData();
          } else {
            console.log("No profile found, initializing with default values");
            
            // Initialize with default empty profile instead of trying to create one
            // The profile should already exist due to the database trigger
            const defaultProfile: UserProfile = {
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
              supportPreferences: [],
              supportType: '',
              certificationBackground: [],
              certifications: {
                status: 'none'
              },
              journeyNote: ''
            };
            
            setProfileData(defaultProfile);
            
            // If no profile exists, use localStorage as fallback
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
              console.log("Using localStorage fallback for profile");
              const parsedProfile = JSON.parse(storedProfile);
              setProfileData(parsedProfile);
            }
          }
        } else {
          console.log("No user session found, using localStorage");
          // No session, use localStorage as fallback
          setIsAuthenticated(false);
          const storedProfile = localStorage.getItem('userProfile');
          if (storedProfile) {
            const parsedProfile = JSON.parse(storedProfile);
            setProfileData(parsedProfile);
          }
        }
        
        // Mark profile as fetched
        profileFetchedRef.current = true;
      } catch (error) {
        console.error('Error in profile:', error);
        // Fallback to localStorage
        const storedProfile = localStorage.getItem('userProfile');
        if (storedProfile) {
          console.log("Using localStorage fallback due to error");
          const parsedProfile = JSON.parse(storedProfile);
          setProfileData(parsedProfile);
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProfile();
  }, [fetchAndUpdateUserProfile]); // Add fetchAndUpdateUserProfile back to dependency array
  
  // Helper function to calculate profile completion percentage from Supabase data
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

  const handleInputChange = (name: string, value: string | boolean | string[]) => {
    setProfileData(prev => {
      const updatedData = {
      ...prev,
      [name]: value
      };
      
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
      const totalFields = Object.keys(updatedData).filter(key => 
        key !== 'completedSetup' && 
        key !== 'profileCompletionPercentage'
      ).length;
      
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
      
      return {
        ...updatedData,
        profileCompletionPercentage: percentage
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCertificationFile(e.target.files[0]);
      handleInputChange('certificationFile', true);
    }
  };

  const handleSave = async () => {
    // Check if mandatory fields are filled
    const mandatoryFields = ['name', 'dateOfBirth', 'location', 'gender'];
    const mandatoryFieldsFilled = mandatoryFields.every(field => 
      profileData[field as keyof UserProfile] !== ''
    );
    
    // Update completedSetup status
    const updatedProfileData = {
      ...profileData,
      completedSetup: mandatoryFieldsFilled
    };
    
    // Save to localStorage for backward compatibility
    localStorage.setItem('userProfile', JSON.stringify(updatedProfileData));
    setProfileData(updatedProfileData);
    
    try {
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log("Session found, saving profile from Profile page");
        
        // Map the profile data to match Supabase schema
        const supabaseProfileData = {
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
          completed_setup: mandatoryFieldsFilled,
          support_type: updatedProfileData.supportType || null,
          updated_at: new Date().toISOString()
        };
        
        // First check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single();
          
        if (fetchError && fetchError.code === 'PGRST116') {
          // Profile doesn't exist, create new profile
          console.log("No profile found, creating new profile from Profile page");
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(supabaseProfileData);
            
          if (insertError) {
            console.error('Error creating profile in Supabase:', insertError);
            alert("There was an error saving your profile. Please try again.");
            return;
          }
        } else if (fetchError) {
          // Other error occurred
          console.error('Error checking existing profile:', fetchError);
          alert("There was an error saving your profile. Please try again.");
          return;
        } else {
          // Profile exists, update it
          console.log("Updating existing profile from Profile page");
          const { error: updateError } = await supabase
            .from('profiles')
            .update(supabaseProfileData)
            .eq('id', session.user.id);
            
          if (updateError) {
            console.error('Error updating profile in Supabase:', updateError);
            alert("There was an error saving your profile. Please try again.");
            return;
          }
        }
        
        console.log("Profile saved successfully to Supabase from Profile page");
      } else {
        console.warn("No session found, profile not saved to Supabase");
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert("There was an error saving your profile. Please try again.");
      return;
    }
    
    setIsEditing(false);
  };

// Example logout function to add to your dashboard component
const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
    
    // Clear localStorage for backward compatibility
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('profileSetupCompleted');
    
    // Redirect to home page
    router.push('/');
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const sections = [
    {
      title: 'Personal Information',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
        { name: 'location', label: 'Location', type: 'text', required: true },
        { name: 'gender', label: 'Gender', type: 'text', required: true }
      ]
    },
    {
      title: 'Professional Information',
      fields: [
        { name: 'workplace', label: 'Workplace', type: 'text', required: false },
        { name: 'jobTitle', label: 'Job Title', type: 'text', required: false },
        { name: 'education', label: 'Education', type: 'text', required: false }
      ]
    },
    {
      title: 'Journey & Support',
      fields: [
       // { name: 'journey', label: 'Primary Journey', type: 'select', options: journeyOptions, required: false },
       { name: 'supportType', label: 'Support Type', type: 'select', options: ['I need support', 'I want to provide support'], required: false }, 
       { name: 'journeyNote', label: 'Your Journey Story', type: 'textarea', required: false },
        { name: 'supportPreferences', label: 'Support Areas', type: 'multiselect', options: journeyOptions, required: false }
      ]
    },
    {
      title: 'Certification',
      fields: [
        { name: 'certificationBackground', label: 'Your Background', type: 'multiselect', 
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
          required: false 
        },
        { name: 'certificationFile', label: 'Upload Certification', type: 'file', required: false },
        { name: 'certificationName', label: 'Certification Name', type: 'text', required: false },
        { name: 'certificationDate', label: 'Certification Issue Date', type: 'date', required: false }
      ]
    },
    {
      title: 'Preferences',
      fields: [
        { name: 'religiousBeliefs', label: 'Religious Beliefs', type: 'text', required: false },
        { name: 'communicationPreferences', label: 'Communication Preferences', type: 'text', required: false },
        { name: 'availability', label: 'Availability', type: 'text', required: false }
      ]
    }
  ];

  // Render function for different field types
  const renderField = (field: { 
    name: string, 
    label: string, 
    type: string, 
    options?: string[], 
    required: boolean 
  }, isEditing: boolean) => {
    if (!isEditing) {
      if (field.name === 'supportPreferences' && Array.isArray(profileData.supportPreferences)) {
        return <p className="text-gray-600">{profileData.supportPreferences.join(', ') || 'Not specified'}</p>;
      } else if (field.name === 'certificationBackground' && Array.isArray(profileData.certificationBackground)) {
        return <p className="text-gray-600">{profileData.certificationBackground.join(', ') || 'Not specified'}</p>;
      } else if (field.name === 'supportType') {
        if (profileData.supportType === 'support-seeker') {
          return <p className="text-gray-600">I need support</p>;
        } else if (profileData.supportType === 'support-giver') {
          return <p className="text-gray-600">I want to provide support</p>;
        } else {
          return <p className="text-gray-600">Not specified</p>;
        }
      } else if (field.name === 'certificationFile') {
        return profileData.certifications?.file ? 
          <p className="text-green-600">Certification uploaded</p> : 
          <p className="text-gray-600">No certification uploaded</p>;
      } else if (field.name === 'certificationName') {
        return <p className="text-gray-600">{profileData.certifications?.name || 'Not specified'}</p>;
      } else if (field.name === 'certificationDate') {
        return <p className="text-gray-600">{profileData.certifications?.issueDate || 'Not specified'}</p>;
      } else if (field.name === 'journeyNote') {
        return (
          <div className="text-gray-600 whitespace-pre-wrap">
            {profileData.journeyNote || 'No journey story provided yet. Edit your profile to share your story.'}
          </div>
        );
      } else {
        return <p className="text-gray-600">{String(profileData[field.name as keyof UserProfile] || 'Not specified')}</p>;
      }
    }

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            id={field.name}
            name={field.name}
            value={field.name === 'certificationName' 
              ? profileData.certifications?.name || '' 
              : profileData[field.name as keyof UserProfile] as string || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={field.required}
          />
        );
      case 'textarea':
        return (
          <textarea
            id={field.name}
            name={field.name}
            value={profileData[field.name as keyof UserProfile] as string || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            required={field.required}
            placeholder="Share your journey story here. This will be visible on your profile and help others connect with your experiences."
          />
        );
      case 'date':
        return (
          <input
            type="date"
            id={field.name}
            name={field.name}
            value={field.name === 'certificationDate' 
              ? profileData.certifications?.issueDate || '' 
              : profileData[field.name as keyof UserProfile] as string || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={field.required}
          />
        );
      case 'select':
        if (field.name === 'supportType') {
          return (
            <select
              value={profileData[field.name as keyof UserProfile] as string || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.required}
            >
              <option value="">Select Support Type</option>
              <option value="support-seeker">I need support</option>
              <option value="support-giver">I want to provide support</option>
            </select>
          );
        } else {
          return (
            <select
              value={profileData[field.name as keyof UserProfile] as string || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={field.required}
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((option: string, i: number) => (
                <option key={i} value={option}>{option}</option>
              ))}
            </select>
          );
        }
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
      case 'multiselect':
        if (field.name === 'supportPreferences') {
          return (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 mt-2">
                {field.options?.map((option: string, i: number) => (
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
                {field.options?.map((option: string, i: number) => (
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
                          : currentBg.filter(p => p !== option);
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
              className="w-full p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {certificationFile && (
              <div className="text-sm text-green-600">
                File selected: {certificationFile.name}
              </div>
            )}
            {profileData.certifications?.file && !certificationFile && (
              <div className="text-sm text-blue-600">
                Current file: Certification document
              </div>
            )}
            <p className="text-xs text-gray-500">
              Upload certification documents to get the "Certified" badge. Our team will review your submission.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Profile
          </h1>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex items-center rounded-full"
            >
              <span className="material-icons">home</span>
            </Button>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="rounded-full"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>
        
        {/* Profile Completion */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Profile Completion
            </h2>
            <span className="text-lg font-bold text-blue-500">
              {profileData.profileCompletionPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-500 h-2.5 rounded-full" 
              style={{ width: `${profileData.profileCompletionPercentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {profileData.completedSetup 
              ? 'Your profile is complete! You can continue adding optional information.' 
              : 'Complete the required fields to unlock all features.'}
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {renderField(field, isEditing)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between">
          {isEditing ? (
            <div className="flex justify-center w-full space-x-4">
              <Button
                onClick={handleSave}
                className="bg-blue-500 hover:bg-blue-600 rounded-full px-8"
              >
                Save Changes
              </Button>
              <Button
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="rounded-full"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-red-600 hover:text-red-700 rounded-full ml-auto"
            >
              Logout
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}