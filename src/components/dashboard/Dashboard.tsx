'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UserProfile } from '@/components/profile/ProfileSetup';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { StrengthEntry } from '@/lib/mindfulness';
import StrengthsTracker from '@/components/features/mindfulness/StrengthsTracker';
import { FiMessageCircle, FiSmile } from 'react-icons/fi';


interface DashboardProps {
  userProfile?: UserProfile | null;
  onStartProfileSetup?: () => void;
}

const features = [
  {
    id: 'ai-companion',
    title: 'AI Companion',
    description: 'Get instant support and guidance',
    icon: 'smart_toy',
    path: '/ai-companion',
    requiresAuth: false
  },
  {
    id: 'peer-support',
    title: 'Peer Support',
    description: 'Connect with others who understand your journey',
    icon: 'people',
    path: '/peer-support',
    requiresAuth: true
  },
  {
    id: 'therapy',
    title: 'Professional Therapy',
    description: 'Get guidance from licensed therapists',
    icon: 'medical_services',
    path: '/therapy',
    requiresAuth: true
  },
  {
    id: 'mindfulness',
    title: 'Mindfulness Tools',
    description: 'Access meditation and stress relief resources',
    icon: 'self_improvement',
    path: '/mindfulness',
    requiresAuth: true
  },
  {
    id: 'resources',
    title: 'Helpful Resources',
    description: 'Find trusted mental health resources and guides',
    icon: 'library_books',
    path: '/resources',
    requiresAuth: false
  }
];

// Inspirational quotes to display randomly
const inspirationalQuotes = [
  {
    quote: "You don't have to control your thoughts. You just have to stop letting them control you.",
    author: "Dan Millman"
  },
  {
    quote: "Mental health problems don't define who you are. They are something you experience.",
    author: "Sangu Delle"
  },
  {
    quote: "There is hope, even when your brain tells you there isn't.",
    author: "John Green"
  },
  {
    quote: "The strongest people are those who win battles we know nothing about.",
    author: "Happistaa"
  },
  {
    quote: "You are not alone in this journey. Every step you take is a step towards healing.",
    author: "Happistaa"
  }
];

// Blog resources interface
interface BlogResource {
  title: string;
  description: string;
  readTime: string;
  category: string;
  image: string;
  url: string;
  embedable?: boolean;
  isVideo?: boolean;
}

// Blog resources
const blogResources: BlogResource[] = [
  {
    title: "Mindfulness Practices from Ancient Indian Traditions",
    description: "Explore meditation techniques rooted in yoga and Ayurveda for mental well-being.",
    readTime: "5 min read",
    category: "Mindfulness",
    image: "https://images.unsplash.com/photo-1545389336-cf090694435e?ixlib=rb-4.0.3",
    url: "https://www.artofliving.org/in-en/meditation/meditation-for-you/benefits-of-meditation",
    embedable: true
  },
  {
    title: "Managing Stress in Modern Indian Life",
    description: "Practical strategies to balance work, family expectations and personal well-being.",
    readTime: "6 min read",
    category: "Stress Management",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3",
    url: "https://nimhans.ac.in/stress-management/",
    embedable: true
  },
  {
    title: "Breaking Mental Health Stigma in Indian Communities",
    description: "How to talk about mental health with family and overcome cultural barriers.",
    readTime: "7 min read",
    category: "Awareness",
    image: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?ixlib=rb-4.0.3",
    url: "https://www.thelivelovelaughfoundation.org/",
    embedable: true
  }
];

export default function Dashboard({ userProfile: propUserProfile, onStartProfileSetup }: DashboardProps) {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(propUserProfile || null);
  const [isGuest, setIsGuest] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [quote, setQuote] = useState(inspirationalQuotes[0]);
  const [streaks, setStreaks] = useState({
    mindfulness: 0,
    peerSupport: 0,
    aiCompanion: 0
  });
  const [overallStreak, setOverallStreak] = useState(0);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [showAuthDropdown, setShowAuthDropdown] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<(typeof blogResources)[0] | null>(null);
  const [showBlogModal, setShowBlogModal] = useState(false);
  
  // State variables from progressmood.tsx
  const [isSupportGiver, setIsSupportGiver] = useState(false);
  const [peopleSupported, setPeopleSupported] = useState(0);
  const [userStrengths, setUserStrengths] = useState<StrengthEntry[]>([]);
  const [currentStrengthIndex, setCurrentStrengthIndex] = useState(0);
  const [breathingState, setBreathingState] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathingSize, setBreathingSize] = useState(100);
  const [showStrengthsModal, setShowStrengthsModal] = useState(false);
  const breathingInterval = useRef<NodeJS.Timeout | null>(null);
  const strengthInterval = useRef<NodeJS.Timeout | null>(null);

  const { user, loading: authLoading, signOut } = useAuth();

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);

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
  
  // Functions from progressmood.tsx
  // Fetch accepted support requests count for support givers
  const fetchPeopleSupported = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_requests')
        .select('id')
        .eq('receiver_id', userId)
        .eq('status', 'accepted');
        
      if (!error && data) {
        setPeopleSupported(data.length);
      }
    } catch (err) {
      console.error('Error fetching support count:', err);
    }
  };
  
  // Fetch user strengths
  const fetchUserStrengths = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('mindfulness_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'strength')
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setUserStrengths(data as StrengthEntry[]);
      }
    } catch (err) {
      console.error('Error fetching strengths:', err);
    }
  };
  
  // Breathing exercise handler
  const toggleBreathingExercise = () => {
    if (breathingInterval.current) {
      // Stop breathing exercise
      clearInterval(breathingInterval.current);
      breathingInterval.current = null;
      setBreathingSize(60);
      setBreathingState('inhale');
    } else {
      // Start breathing exercise
      startBreathingExercise();
    }
  };
  
  const startBreathingExercise = () => {
    // Initial state
    setBreathingState('inhale');
    setBreathingSize(60);
    
    let phase = 'inhale';
    let counter = 0;
    
    breathingInterval.current = setInterval(() => {
      counter++;
      
      if (phase === 'inhale' && counter <= 4) {
        // Inhale for 4 seconds - circle grows
        setBreathingSize(prev => prev + 10);
      } else if (phase === 'inhale' && counter > 4) {
        // Transition to hold
        phase = 'hold';
        counter = 0;
        setBreathingState('hold');
      } else if (phase === 'hold' && counter <= 3) {
        // Hold for 4 seconds - circle stays same size
      } else if (phase === 'hold' && counter > 3) {
        // Transition to exhale
        phase = 'exhale';
        counter = 0;
        setBreathingState('exhale');
      } else if (phase === 'exhale' && counter <= 4) {
        // Exhale for 6 seconds - circle shrinks
        setBreathingSize(prev => prev - 10);
      } else if (phase === 'exhale' && counter > 4) {
        // Transition back to inhale
        phase = 'inhale';
        counter = 0;
        setBreathingState('inhale');
      }
    }, 1000);
  };
  
  // Handle opening strengths modal
  const handleOpenStrengths = () => {
    setShowStrengthsModal(true);
  };
  
  // Handle closing strengths modal
  const handleCloseStrengths = () => {
    setShowStrengthsModal(false);
    // Refresh strengths after modal closes
    if (user) {
      fetchUserStrengths(user.id);
    }
  };
  
  // Handle role toggle for testing
  const handleToggleRole = () => {
    setIsSupportGiver(!isSupportGiver);
  };

  useEffect(() => {
    // If props are provided, use them instead of fetching from Supabase
    if (propUserProfile) {
      setUserProfile(propUserProfile);
      setIsLoading(false);
      return;
    }
    
    const fetchUserProfile = async () => {
      setIsLoading(true);
      
      try {
        // Get user session from Auth hook
        if (user) {
          console.log("User is authenticated, fetching profile from Supabase");
          setIsAuthenticated(true);
          
          // Fetch profile from Supabase
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error('Error fetching profile from Supabase:', error.message);
            // Fallback to localStorage if Supabase fetch fails
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
              console.log("Using localStorage fallback for profile");
              const parsedProfile = JSON.parse(storedProfile);
              setUserProfile(parsedProfile);
              setIsGuest(parsedProfile.completedSetup === false);
            }
          } else if (profile) {
            console.log("Profile found in Supabase:", profile);
            console.log("Profile completed_setup status:", profile.completed_setup);
            
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
            
            setUserProfile(mappedProfile);
            setIsGuest(profile.completed_setup === false);

            // Logic from progressmood.tsx to determine role
            if (profile.support_type === 'support-giver' || profile.support_type === 'I want to provide support') {
                setIsSupportGiver(true);
                fetchPeopleSupported(user.id);
            } else {
                // If user is support seeker, fetch their strengths
                fetchUserStrengths(user.id);
            }
            
            // Save to localStorage for backward compatibility
            localStorage.setItem('userProfile', JSON.stringify(mappedProfile));
            localStorage.setItem('profileSetupCompleted', profile.completed_setup ? 'true' : 'false');
            localStorage.setItem('isAuthenticated', 'true');
            
            // Clear unnecessary localStorage data
            localStorage.removeItem('supportType');
            localStorage.removeItem('selectedJourneys');
            localStorage.removeItem('journeyNote');
            console.log("Cleared unnecessary localStorage data");
          }
        } else {
          // User is not authenticated, check localStorage for guest data
          setIsAuthenticated(false);
          const storedProfile = localStorage.getItem('userProfile');
          const isAuthenticated = localStorage.getItem('isAuthenticated');
          
          if (storedProfile) {
            const profile = JSON.parse(storedProfile);
            setUserProfile(profile);
            setIsGuest(profile.completedSetup === false);
            setIsAuthenticated(!!isAuthenticated);
          }
        }
    
        // Set a random quote
        setQuote(inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)]);
        
        // Mock streak data - in a real app this would come from an API or local storage
        setStreaks({
          mindfulness: 3,
          peerSupport: 1,
          aiCompanion: 5
        });
        setOverallStreak(7);
      } catch (error) {
        console.error("Error in dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch profile if auth is not loading
    if (!authLoading) {
      fetchUserProfile();
    }
  }, [propUserProfile, user, authLoading]);
  
  // useEffect hooks from progressmood.tsx
  // Rotate through strengths in carousel
  useEffect(() => {
    if (userStrengths.length > 1) {
      strengthInterval.current = setInterval(() => {
        setCurrentStrengthIndex(prev => (prev + 1) % userStrengths.length);
      }, 5000); // Change strength every 5 seconds
    }
    
    return () => {
      if (strengthInterval.current) {
        clearInterval(strengthInterval.current);
      }
    };
  }, [userStrengths]);
  
  // Cleanup breathing interval on unmount
  useEffect(() => {
    return () => {
      if (breathingInterval.current) {
        clearInterval(breathingInterval.current);
      }
    };
  }, []);


  const handleFeatureClick = (feature: typeof features[0]) => {
    // Always navigate to the feature page regardless of authentication status
    // Sign-up will be prompted on the feature page when trying to interact with items
    router.push(feature.path);
  };

  const handleCompleteProfile = () => {
    if (onStartProfileSetup) {
      onStartProfileSetup();
    } else {
      router.push('/auth/signup');
    }
  };

  const toggleAuthDropdown = () => {
    setShowAuthDropdown(!showAuthDropdown);
  };

  const handleBlogClick = (blog: typeof blogResources[0]) => {
    // Check if the content is embedable
    if (blog.embedable) {
      setSelectedBlog(blog);
      setShowBlogModal(true);
    } else {
      // If not embedable, open directly in a new tab
      window.open(blog.url, '_blank');
    }
  };

  const handleLogout = () => (
    <Button
      onClick={signOut}
      variant="outline"
      className="ml-2 rounded-full text-sm text-red-600 hover:text-red-700"
      size="sm"
    >
      Logout
    </Button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-[#1E3A5F]">
            Happistaa
          </h1>
          
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mt-3">
              {isAuthenticated ? 'Welcome back' : 'Welcome'}
            </h2>
        
            {/* Auth and Profile Section */}
            <div className="items-center space-x-2">
                {isAuthenticated ? (
                  <div className="flex items-center">
                    <div className="relative cursor-pointer" onClick={() => router.push('/profile')}>
                      <div className="relative w-12 h-12 mt-3">
                        <svg className="w-12 h-12" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" strokeWidth="2"></circle>
                          <circle 
                            cx="18" 
                            cy="18" 
                            r="16" 
                            fill="none" 
                            stroke="#3b82f6" 
                            strokeWidth="2" 
                            strokeDasharray={`${userProfile?.profileCompletionPercentage || 67}, 100`}
                            transform="rotate(-90 18 18)"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center text-sm font-medium">
                            {userProfile?.name ? userProfile.name[0].toUpperCase() : 'G'}
                          </div>
                        </div>
                      </div>
                    </div>
                    {handleLogout()}
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => router.push('/auth/login')}
                      variant="outline"
                      className="rounded-full"
                    >
                      Login
                    </Button>
                    <Button
                      onClick={() => router.push('/auth/signup')}
                      className="rounded-full"
                    >
                      Sign Up
                    </Button>
                  </div>
                )}
              </div>
            </div>
        </div>
        
        {/* Role toggle for testing */}
        {/* {isAuthenticated && (
            <div className="flex justify-end mb-2">
              <div className="flex items-center space-x-2 bg-white bg-opacity-50 rounded-full px-3 py-1">
                <span className="text-xs text-gray-700">Role:</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={isSupportGiver} 
                    onChange={handleToggleRole}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-xs text-gray-700">
                    {isSupportGiver ? 'Support Giver' : 'Support Seeker'}
                  </span>
                </div>
              </div>
            </div>
          )} */}


{/* Main Dashboard Sections */}
<div className="grid grid-cols-2 gap-4">
    {/* Progress Section */}
    <div className="bg-[#F6D2C6] p-5 rounded-3xl shadow-sm">
        
        {/* Conditional display for authenticated users */}
        {isAuthenticated && (
            <>
                {isSupportGiver ? (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">People Supported</h2>
                        <div className="flex items-center justify-center">
                            <div className="relative w-28 h-28">
                                <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f3e1d4" strokeWidth="10" />
                                    <circle 
                                        cx="50" 
                                        cy="50" 
                                        r="45" 
                                        fill="none" 
                                        stroke="#1e3a5f" 
                                        strokeWidth="10" 
                                        strokeDasharray={`${peopleSupported * 5}, 300`} 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-4xl font-bold text-gray-900">{peopleSupported}</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div 
                        className="flex flex-col h-full gap-3 cursor-pointer"
                        onClick={handleOpenStrengths}
                    >
                       <h2 className="text-2xl font-bold text-gray-900">Strengths</h2>
                       <div className="relative h-24 overflow-hidden bg-white bg-opacity-40 rounded-lg p-3 flex-grow flex items-center justify-center">
                           {userStrengths.length > 0 ? (
                               userStrengths.map((strength, index) => (
                                   <div 
                                       key={strength.id} 
                                       className={`absolute w-full px-2 transition-opacity duration-700 ${index === currentStrengthIndex ? 'opacity-100' : 'opacity-0'}`}
                                   >
                                       <p className="text-center text-gray-800 font-medium text-sm leading-tight line-clamp-3">{strength.content}</p>
                                       <div className="flex justify-center mt-2">
                                           <span className={`text-xs px-2 py-1 rounded-full capitalize font-medium ${
                                               strength.category === 'personal' ? 'bg-blue-100 text-blue-700' :
                                               strength.category === 'social' ? 'bg-green-100 text-green-700' :
                                               strength.category === 'professional' ? 'bg-purple-100 text-purple-700' :
                                               strength.category === 'emotional' ? 'bg-yellow-100 text-yellow-700' :
                                               strength.category === 'cognitive' ? 'bg-red-100 text-red-700' :
                                               'bg-gray-100 text-gray-700'
                                           }`}>
                                               {strength.category}
                                           </span>
                                       </div>
                                   </div>
                               ))
                           ) : (
                               <div className="text-center text-gray-600 italic">
                                   Add now for daily reminders
                               </div>
                           )}
                       </div>
                       
                       {/* Carousel indicators */}
                       {userStrengths.length > 1 && (
                           <div className="flex justify-center items-center space-x-1.5">
                               {userStrengths.map((_, index) => (
                                   <div 
                                       key={index}
                                       className={`w-2 h-2 rounded-full transition-colors duration-300 ${currentStrengthIndex === index ? 'bg-[#36B7CD]' : 'bg-gray-300'}`}
                                   />
                               ))}
                           </div>
                       )}
                   </div>
                )}
            </>
        )}
        
        {/* Conditional display for non-authenticated users */}
        {!isAuthenticated && (
            <>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Start now</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Take the first step towards a happier you.
                </p>
                <button 
                  onClick={() => router.push('/auth/signup')}
                  className="bg-[#1E3A5F] text-white px-4 py-2 rounded-full hover:bg-opacity-90 transition-colors"
                >
                  Start
                </button>
            </>
        )}
    </div>

    {/* Quick Breathing Exercise Card */}
    <div className="bg-[#F6D2C6] p-5 rounded-3xl shadow-sm flex flex-col">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Breathe</h2>
        <div className="flex-grow flex items-center justify-center">
            <div 
                className="relative rounded-full bg-[#1E3A5F] cursor-pointer transition-all duration-1000 flex items-center justify-center text-white"
                style={{ 
                    width: `${breathingSize}px`, 
                    height: `${breathingSize}px`,
                    maxWidth: '120px',
                    maxHeight: '120px',
                }}
                onClick={toggleBreathingExercise}
            >
                <div className="flex flex-col items-center">
                    <span className="text-center font-medium text-sm capitalize">
                        {breathingInterval.current ? breathingState : 'Start'}
                    </span>
                    <span className="material-icons text-lg mt-1">self_improvement</span>
                </div>
            </div>
        </div>
    </div>
</div>
        {/* Support options - 2x2 grid */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Support options</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* AI Companion */}
            <div 
              onClick={() => handleFeatureClick(features[0])}
              className="bg-[#F6D2C6] p-3 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start">
                <span className="material-icons text-3xl mr-2 text-slate-600">smart_toy</span>
                <div>
                  <h3 className="font-semibold text-gray-900">AI Companion</h3>
                  <p className="text-sm text-gray-600 mt-1">Get instant support and guidance</p>
                </div>
              </div>
            </div>
            
            {/* Peer Support - Highlighted */}
            <div 
              onClick={() => handleFeatureClick(features[1])}
              className="bg-[#C4D9F8] p-3 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              {/* Highlight indicator */}
              <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-primary/60"></div>
              
              <div className="flex items-start">
                <span className="material-icons text-3xl mr-2 text-primary">people</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Peer Support</h3>
                  <p className="text-sm text-gray-600 mt-1">Connect with others who understand your journey</p>
                </div>

              </div>
            </div>
            
            {/* Professional Therapy */}
            <div 
              onClick={() => handleFeatureClick(features[2])}
              className="bg-[#F6D2C6] p-3 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start">
                <span className="material-icons text-3xl mr-2 text-emerald-600">medical_services</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Professional Therapy</h3>
                  <p className="text-sm text-gray-600 mt-1">Get guidance from licensed therapists</p>
                </div>
              </div>
            </div>
            
            {/* Mindfulness Tools */}
            <div 
              onClick={() => handleFeatureClick(features[3])}
              className="bg-[#F6D2C6] p-3 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start">
                <span className="material-icons text-3xl mr-2 text-amber-600">self_improvement</span>
                <div>
                  <h3 className="font-semibold text-gray-900">Mindfulness Tools</h3>
                  <p className="text-sm text-gray-600 mt-1">Access meditation and stress relief</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inspirational quote */}
        <div className="text-center py-6">
          <p className="text-xl italic text-gray-700">"{quote.quote}"</p>
          <p className="text-sm text-gray-500 mt-2">— {quote.author}</p>
        </div>

        {/* Resources Section with horizontal scroll */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Recommended Resources</h2>
          <div className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide">
            {blogResources.map((blog, index) => (
              <div 
                key={blog.title}
                onClick={() => handleBlogClick(blog)}
                className={`rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex-shrink-0 ${
                  index % 3 === 0 ? 'bg-[#FDF3EB]' : 
                  index % 3 === 1 ? 'bg-[#F1D6C2]' : 'bg-[#E8A87C]'
                }`}
                style={{ width: "280px" }}
              >
                <img 
                  src={blog.image} 
                  alt={blog.title} 
                  className="w-full h-40 object-cover"
                />
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium px-2 py-1 bg-white bg-opacity-50 text-gray-800 rounded-full">
                      {blog.category}
                    </span>
                    <span className="text-xs text-gray-700">{blog.readTime}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{blog.title}</h3>
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{blog.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Blog Modal */}
      {showBlogModal && selectedBlog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <div>
                <h2 className="text-xl font-semibold">{selectedBlog.title}</h2>
                <p className="text-sm text-gray-600">{selectedBlog.category} • {selectedBlog.readTime}</p>
              </div>
              <button 
                onClick={() => setShowBlogModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe 
                src={selectedBlog.url} 
                className="w-full h-full min-h-[70vh] border-none"
                title={selectedBlog.title}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                loading="lazy"
                allowFullScreen={selectedBlog.isVideo}
              ></iframe>
            </div>
            <div className="p-4 border-t flex justify-between items-center">
              <p className="text-sm text-gray-600">{selectedBlog.description}</p>
              <Button 
                onClick={() => window.open(selectedBlog.url, '_blank')}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-full"
              >
                <span className="material-icons mr-1 text-sm">open_in_new</span>
                Open in New Tab
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Strengths Modal */}
        {showStrengthsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <StrengthsTracker onClose={handleCloseStrengths} />
            </div>
        )}

        {/* Floating Feedback Button */}
        {isAuthenticated && (
          <button
            className="fixed bottom-8 right-8 z-50 bg-[#1E3A5F] text-white rounded-full p-4 shadow-lg hover:bg-[#274472] transition-colors flex items-center justify-center"
            title="Send Feedback"
            onClick={() => setShowFeedbackModal(true)}
            style={{ boxShadow: '0 4px 24px rgba(30,58,95,0.15)' }}
          >
            <FiMessageCircle size={28} />
          </button>
        )}

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative">
              <button
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowFeedbackModal(false)}
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-xl font-semibold mb-4 text-center">We value your feedback</h2>
              <div className="flex flex-col items-center space-y-4">
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSeQ_EGLtyF1onH8lmo5jtHyuwpfA20nLd_EUDK5hPUFAlaGQA/viewform?usp=dialog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#1E3A5F] text-white rounded-full py-2 font-semibold hover:bg-[#274472] transition-colors text-center"
                >
                  Fill Feedback Form
                </a>
                {/* Optionally, embed the form below instead of a button: */}
                
                <iframe
                  src="https://docs.google.com/forms/d/e/1FAIpQLSeQ_EGLtyF1onH8lmo5jtHyuwpfA20nLd_EUDK5hPUFAlaGQA/viewform?embedded=true"
                  width="100%"
                  height="600"
                  frameBorder="0"
                 // marginHeight="0"
                // marginWidth="0"
                  title="Feedback Form"
                >Loading…</iframe>
               
              </div>
            </div>
          </div>
        )}
    </div>
  );
}