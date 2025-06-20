'use client'

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { PeerMatch, ChatMessage } from '@/types/peer-support';
import { usePeerMatching } from '@/hooks/peer-support/usePeerMatching';
import { usePeerChat } from '@/hooks/peer-support/usePeerChat';
import { useSupportRequests } from '@/hooks/peer-support/useSupportRequests';
import { PeerCard } from './components/PeerCard';
import { PeerFilters } from './components/PeerFilters';
import { PeerChat } from './components/PeerChat';
import { JourneySelector } from './components/JourneySelector';
import { SupportRequests } from './components/SupportRequests';
import { SentRequests } from './components/SentRequests';
import Link from 'next/link';
import { Notification } from './components/Notification';
import AICompanion from '@/components/features/ai-companion/AICompanion';
import EnhancedAffirmations from '@/components/features/mindfulness/EnhancedAffirmations';
import EnhancedFocusTimer from '@/components/features/mindfulness/EnhancedFocusTimer';
import EnhancedGratitudeJournal from '@/components/features/mindfulness/EnhancedGratitudeJournal';
import EnhancedJournal from '@/components/features/mindfulness/EnhancedJournal';
import QuickBreathe from '@/components/features/mindfulness/QuickBreathe';
import StrengthsTracker from '@/components/features/mindfulness/StrengthsTracker';

export default function PeerSupportPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedJourneys, setSelectedJourneys] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'need' | 'give' | 'all'>('all');
  
  // View toggles
  const [showJourneySelector, setShowJourneySelector] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showSortOptions, setShowSortOptions] = useState<boolean>(false);
  const [activeOnlyFilter, setActiveOnlyFilter] = useState<boolean | null>(null);
  const [sortBy, setSortBy] = useState<'match' | 'rating' | 'peopleSupported' | 'availability'>('match');

  // Chat related state
  const [showChat, setShowChat] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [myChatsList, setMyChatsList] = useState<PeerMatch[]>([]);
  const [showMyChatsList, setShowMyChatsList] = useState<boolean>(false);
  const [showRequests, setShowRequests] = useState<boolean>(false);
  const [requestsTab, setRequestsTab] = useState<'sent' | 'received'>('received');
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [sentRequestsIds, setSentRequestsIds] = useState<string[]>([]);

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // AI companion state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [showAffirmations, setShowAffirmations] = useState(false);
  const [showFocusTimer, setShowFocusTimer] = useState(false);
  const [showGratitude, setShowGratitude] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const [showBreathe, setShowBreathe] = useState(false);
  const [showStrengths, setShowStrengths] = useState(false);

  // Use our custom hooks
  const { user, loading: authLoading } = useAuth();
  
  const { 
    filteredPeers, 
    isLoading: isPeersLoading,
    fetchPeers,
    userProfile: hookUserProfile,
    isProfileLoaded
  } = usePeerMatching();

  const {
    selectedPeer,
    setSelectedPeer,
    messages,
    isLoading: isChatLoading,
    error: chatError,
    isAnonymous,
    setIsAnonymous,
    fetchMessages,
    sendMessage,
    initializeChat
  } = usePeerChat();

  const {
    supportRequests: supportRequestsFromHooks,
    sentRequestsIds: sentRequestsIdsFromHooks,
    acceptedConnectionIds: acceptedConnectionIdsFromHooks,
    isLoading: isRequestsLoading,
    isSubmitting: isSendingRequest,
    fetchSupportRequests,
    createSupportRequest,
    updateSupportRequest,
    cancelSupportRequest
  } = useSupportRequests();

  // Support requests related functions
  const handleAcceptRequest = async (requestId: string) => {
    const acceptedRequest = supportRequestsFromHooks.find(req => req.id === requestId);
    if (acceptedRequest) {
      // Update the request status in the database
      await updateSupportRequest(requestId, 'accepted');
      // Notify the support-seeker
      notifySupportSeeker('accepted');
      
      // Get the sender of the request as our peer
      const acceptedPeer = {
        id: acceptedRequest.sender_id,
        name: acceptedRequest.is_anonymous ? 'Anonymous User' : (acceptedRequest.sender?.name || 'Peer'),
        avatar: acceptedRequest.sender?.avatar_url || '😊',
        matchScore: 0,
        supportPreferences: acceptedRequest.sender?.support_preferences || [],
        supportType: 'support-seeker', // Assuming if they sent a request they're seeking support
        location: acceptedRequest.sender?.location || '',
        isActive: true,
        rating: 0,
        totalRatings: 0,
        certifiedMentor: false
      } as PeerMatch; // Use type assertion
      
      // Add the peer to the My Chats list
      setMyChatsList(prev => {
        // Don't add if the peer already exists in the list
        if (prev.some(p => p.id === acceptedPeer.id)) {
          return prev;
        }
        return [...prev, acceptedPeer];
      });
      
      setSelectedPeer(acceptedPeer);
      setShowChat(true);
      setShowRequests(false);
      
      // Prepare initial message
      const initialMessages = [{
        id: 'system-welcome',
        sender: 'system',
        message: `You have accepted the connection request. This conversation is private and secure.`,
        timestamp: new Date(),
        isAnonymous: false
      }];
      
      setChatMessages(initialMessages);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    // Update the request status in the database
    await updateSupportRequest(requestId, 'rejected');
    // Notify the support-seeker
    notifySupportSeeker('rejected');
    
    // Remove from local state
    setSupportRequests(prev => prev.filter(req => req.id !== requestId));
  };

  // Connect with peer function - now with message and anonymity support
  const handleConnect = async (peer: PeerMatch, message: string, isAnonymous: boolean) => {
    if (!isAuthenticated) {
      router.push('/auth/signup?redirect=peer-support');
      return;
    }
    
    try {
      // Create a support request
      await createSupportRequest(peer.id, message, isAnonymous);
      // Notify the support-giver
      notifySupportGiver('received');
      
      // Show success notification
      setNotification({
        type: 'success',
        message: `Request sent to ${peer.name}!`
      });
      
    } catch (error) {
      console.error('Error connecting with peer:', error);
      setNotification({
        type: 'error',
        message: 'Failed to send request. Please try again.'
      });
    }
  };

  // Handle opening chat with a connected peer
  const handleOpenChat = (peer: PeerMatch) => {
    console.log("Opening chat with peer:", peer.name, peer.id);
    setSelectedPeer(peer);
    setShowChat(true);
    setChatMessages([]);
  };

  // Handle cancelling a sent request
  const handleCancelRequest = async (requestId: string) => {
    await cancelSupportRequest(requestId); // We don't need receiver_id here as we pass request ID
    // Notify the support-giver
    notifySupportGiver('cancelled');
    
    // Refresh sent requests
    fetchSupportRequests('sent', 'pending');
  };
  
  const handleDeleteChat = async (peer: PeerMatch, event: React.MouseEvent) => {
    // Stop the click from propagating to the parent element
    event.stopPropagation();
    
    try {
      // Get the current session
      const {
        data: { session: deleteSession }
      } = await supabase.auth.getSession();

      const response = await fetch(`/api/peer-support/chats?peer_id=${peer.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${deleteSession?.access_token || ''}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }
      
      // Remove the peer from the my chats list
      setMyChatsList(prev => prev.filter(p => p.id !== peer.id));
      
      // Show success notification
      setNotification({
        type: 'success',
        message: `Chat with ${peer.name} has been deleted`
      });
      
    } catch (error) {
      console.error('Error deleting chat:', error);
      setNotification({
        type: 'error',
        message: 'Failed to delete chat. Please try again.'
      });
    }
  };
  
  // Add the loadMyChats function here
  const loadMyChats = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      // Fetch accepted requests to populate My Chats list
      const acceptedRequests = supportRequestsFromHooks.filter(
        req => req.status === 'accepted' && (req.sender_id === user?.id || req.receiver_id === user?.id)
      );
      
      // Transform the accepted requests into PeerMatch objects
      const chatPeers = acceptedRequests.map(req => {
        // If user is the sender, the peer is the receiver
        const isPeerReceiver = req.sender_id === user?.id;
        const peerId = isPeerReceiver ? req.receiver_id : req.sender_id;
        const peerName = isPeerReceiver 
          ? (req.receiver?.name || 'Peer')
          : req.is_anonymous 
            ? 'Anonymous User' 
            : (req.sender?.name || 'Peer');
        const peerAvatar = isPeerReceiver 
          ? (req.receiver?.avatar_url || '😊')
          : (req.sender?.avatar_url || '😊');
        const peerSupportPrefs = isPeerReceiver 
          ? (req.receiver?.support_preferences || [])
          : (req.sender?.support_preferences || []);
          
        return {
          id: peerId,
          name: peerName,
          avatar: peerAvatar,
          matchScore: 0,
          supportPreferences: peerSupportPrefs,
          supportType: isPeerReceiver ? 'support-seeker' : 'support-giver',
          location: '',
          isActive: true,
          rating: 0,
          totalRatings: 0,
          certifiedMentor: false
        } as PeerMatch; // Add explicit type casting
      });
      
      // Update the myChatsList state with the transformed data
      if (chatPeers.length > 0) {
        setMyChatsList(chatPeers);
      }
      
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  }, [isAuthenticated, user, supportRequestsFromHooks]);
  
  // Load support requests and sent requests
  useEffect(() => {
    if (isAuthenticated && user) {
      // Fetch received requests
      fetchSupportRequests('received', 'pending');
    }
  }, [isAuthenticated, user, fetchSupportRequests]);
  
  // Add a new useEffect to load my chats when the component mounts or when support requests change
  useEffect(() => {
    if (isAuthenticated && user && supportRequestsFromHooks.length > 0) {
      loadMyChats();
    }
  }, [isAuthenticated, user, supportRequestsFromHooks, loadMyChats]);

  // Use the hook values for the support requests
  useEffect(() => {
    if (supportRequestsFromHooks) {
      setSupportRequests(supportRequestsFromHooks);
    }
    
    if (sentRequestsIdsFromHooks) {
      setSentRequestsIds(sentRequestsIdsFromHooks);
    }
  }, [supportRequestsFromHooks, sentRequestsIdsFromHooks]);

  // Count requests for the badge
  const sentRequestsCount = supportRequestsFromHooks.filter(req => 
    req.sender_id === user?.id && req.status === 'pending'
  ).length;
  
  const receivedRequestsCount = supportRequestsFromHooks.filter(req => 
    req.receiver_id === user?.id && req.status === 'pending'
  ).length;
  
  const totalRequestsCount = sentRequestsCount + receivedRequestsCount;

  // Journey options
  const journeyOptions = [
    'Stress','Anxiety', 'Career Change', 'Academic Stress', 'Family Issues', 
    'Relocation', 'Health & Wellness', 'Work-Life Balance', 'Parenthood',
    'Heartbreak', 'Loneliness', 'Mental Health', 
    'Depression', 
    'Relationship Issues',
    'Career Challenges',
    'Academic Pressure'
  ];

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

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoading(true);
      
      try {
        if (user) {
          setIsAuthenticated(true);
          
          // Fetch profile from Supabase
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error) {
            console.error('Error fetching profile:', error.message);
            // Fallback to localStorage if Supabase fetch fails
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
              const parsedProfile = JSON.parse(storedProfile);
              setUserProfile(parsedProfile);
              setIsGuest(parsedProfile.completedSetup === false);
            }
          } else if (profile) {
            // Map Supabase profile to our application profile structure
            const mappedProfile = {
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
            
            // Save to localStorage for backward compatibility
            localStorage.setItem('userProfile', JSON.stringify(mappedProfile));
            localStorage.setItem('profileSetupCompleted', profile.completed_setup ? 'true' : 'false');
            localStorage.setItem('isAuthenticated', 'true');
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
  }, [user, authLoading]);

  // Fetch peers based on user profile
  useEffect(() => {
    console.log('Fetching peers with userProfile:', userProfile);
    if (userProfile) {
      const filters: Record<string, any> = {};
      
      // Add support type filter based on user's role
      if (userProfile.supportType === 'support-seeker') {
        console.log('User is support-seeker, filtering for support-giver');
        filters.supportType = 'support-giver';
        // Set anonymous mode by default for support seekers
        setIsAnonymous(true);
      } else if (userProfile.supportType === 'support-giver') {
        console.log('User is support-giver, filtering for support-seeker');
        filters.supportType = 'support-seeker';
      } else {
        console.log('User support type:', userProfile.supportType);
      }
      
      // Add supportPreferences filter if user has them
      if (selectedJourneys.length > 0) {
        console.log('Using selected journeys for filtering:', selectedJourneys);
        filters.supportPreferences = selectedJourneys;
      } else if (userProfile.supportPreferences && userProfile.supportPreferences.length > 0) {
        console.log('Using user profile support preferences:', userProfile.supportPreferences);
        setSelectedJourneys(userProfile.supportPreferences);
        filters.supportPreferences = userProfile.supportPreferences;
      }
      
      // Add client-side filters
      filters.activeOnly = activeOnlyFilter === true ? true : undefined;
      filters.sortBy = sortBy;
      
      console.log('Fetching peers with filters:', filters);
      // Fetch peers with the appropriate filters
      fetchPeers(filters);
    } else {
      console.log('No user profile, fetching all peers');
      // If no user profile, fetch all peers
      fetchPeers();
    }
  }, [userProfile, selectedJourneys, activeOnlyFilter, sortBy, fetchPeers, setIsAnonymous]);

  // Initialize user view preferences
  useEffect(() => {
    // Check if profile is complete
    const profileCompleted = localStorage.getItem('profileSetupCompleted');
    const profileData = localStorage.getItem('userProfile');
    
    if (profileCompleted === 'true' && profileData) {
      const profile = JSON.parse(profileData);
      
      // Only consider profile complete if the user has fully completed setup
      setIsProfileComplete(profile.completedSetup !== false);
      
      // Set initial view based on user's support preferences
      if (profile.supportType === "support-seeker") {
        setActiveView('need');
        // Set anonymous mode by default for support seekers
        setIsAnonymous(true);
      } else if (profile.supportType === "support-giver") {
        setActiveView('give');
      } 
      
      // Set initial selected journeys from user's preferences
      if (profile.supportPreferences && profile.supportPreferences.length > 0) {
        setSelectedJourneys(profile.supportPreferences);
      } 
    }
    
    // Check if there's a chat parameter in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const shouldOpenChat = urlParams.get('chat') === 'open';
    
    if (shouldOpenChat) {
      // Get selected peer from localStorage
      const selectedPeerData = localStorage.getItem('selectedPeer');
      if (selectedPeerData) {
        const peer = JSON.parse(selectedPeerData);
        setSelectedPeer(peer);
        setShowChat(true);
        
        // Get anonymous mode from localStorage
        const anonymousData = localStorage.getItem('isAnonymous');
        if (anonymousData) {
          setIsAnonymous(JSON.parse(anonymousData));
        }
        
        // Get chat messages from localStorage
        const chatMessagesData = localStorage.getItem('chatMessages');
        if (chatMessagesData) {
          const messages = JSON.parse(chatMessagesData);
          setChatMessages(messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        }
        
        // Clean URL parameter
        window.history.replaceState({}, document.title, '/peer-support');
      }
    }
    
    setIsLoading(false);
  }, [setIsAnonymous, setSelectedPeer]); 

  // Handle adding or removing a journey from selection
  const handleJourneyToggle = (journey: string) => {
    if (selectedJourneys.includes(journey)) {
      setSelectedJourneys(prev => prev.filter(j => j !== journey));
    } else {
      setSelectedJourneys(prev => [...prev, journey]);
    }
  };

  // Save selected journeys to user profile
  const saveJourneyPreferences = async () => {
    if (!userProfile) return;
    
    const updatedProfile = {
      ...userProfile,
      supportPreferences: selectedJourneys
    };
    
    // Save to localStorage for backward compatibility
    localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    setUserProfile(updatedProfile);
    
    // Save to Supabase if user is authenticated
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const updateData = {
          support_preferences: selectedJourneys,
          updated_at: new Date().toISOString(),
          journey_note: userProfile.journeyNote
        };
        
        // Update the fields
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', session.user.id);
          
        if (error) {
          console.error('Error updating journey preferences in Supabase:', error);
        }
      }
    } catch (error) {
      console.error("Error saving journey preferences to Supabase:", error);
    }

    // Fetch new peers with updated journey preferences
    const filters = {
      supportType: updatedProfile.supportType === 'support-seeker' ? 'support-giver' : 
                  updatedProfile.supportType === 'support-giver' ? 'support-seeker' : undefined,
      supportPreferences: selectedJourneys,
      activeOnly: activeOnlyFilter,
      sortBy: sortBy
    };
    
    // Fetch peers with the updated filters
    fetchPeers(filters);
    
    setShowJourneySelector(false);
  };

  // Get personalized message based on user's journey
  const getPersonalizedMessage = () => {
    if (!userProfile || !userProfile.supportPreferences) return null;
    
    const journey = userProfile.supportPreferences;
    
    // If user is a support seeker, show appropriate message
    if (userProfile.supportType === 'support-seeker') {
      return {
        title: `We've got you with ${journey}`,
        description: `Connect with peers who get you anonymously, without fear of judgment. Our community is here to support you.`
      };
    }
    
    // If user is a support giver, show appropriate message
    if (userProfile.supportType === 'support-giver') {
      return {
        title: `Your impact awaits for ${journey}`,
        description: `People dealing with ${journey} need your support. Share your experience and make a difference today.`
      };
    }
    
    // Default message
    return {
      title: 'Find your peer support match',
      description: "Connect with others who understand what you're going through or help someone on their journey."
    };
  };
  
  const personalizedMessage = getPersonalizedMessage();
  
  // Helper function to get appropriate CSS classes based on user type
  const getMessageStyles = () => {
    if (!userProfile) return {
      container: 'bg-white',
      title: 'text-gray-900',
      text: 'text-gray-600'
    };
    
    if (userProfile.supportType === 'support-seeker') {
      return {
        container: 'bg-blue-50 border border-blue-100',
        title: 'text-blue-800',
        text: 'text-blue-700'
      };
    }
    
    if (userProfile.supportType === 'support-giver') {
      return {
        container: 'bg-green-50 border border-green-100',
        title: 'text-green-800',
        text: 'text-green-700'
      };
    }
    
    return {
      container: 'bg-white',
      title: 'text-gray-900',
      text: 'text-gray-600'
    };
  };
  
  const messageStyles = getMessageStyles();

  // Show "Get More Relevant Matches" banner for authenticated users
  const showRelevantMatchesBanner = userProfile && (!userProfile.workplace || !userProfile.jobTitle 
    || !userProfile.education || !userProfile.communicationPreferences || !userProfile.availability);

  // Notification stubs for support-seeker and support-giver events
  const notifySupportSeeker = (type: 'accepted' | 'rejected' | 'first-message') => {
    // TODO: Trigger in-app notification with calming tone
    // TODO: Trigger email notification with calming tone
    let message = '';
    switch (type) {
      case 'accepted':
        message = 'Your support request has been accepted. Take a deep breath and know you are not alone.';
        break;
      case 'rejected':
        message = 'Your support request was not accepted this time. Remember, support is always available.';
        break;
      case 'first-message':
        message = 'You have received a new message from your support peer. Take your time to respond.';
        break;
    }
    setNotification({ type: 'info', message });
    // TODO: Call email notification API
  };
  const notifySupportGiver = (type: 'received' | 'cancelled' | 'first-message') => {
    // TODO: Trigger in-app notification with calming tone
    // TODO: Trigger email notification with calming tone
    let message = '';
    switch (type) {
      case 'received':
        message = 'A new support request has arrived. Thank you for being here for others.';
        break;
      case 'cancelled':
        message = 'A support request was cancelled. Your willingness to help is appreciated.';
        break;
      case 'first-message':
        message = 'You have received a new message from your support seeker. Thank you for your support.';
        break;
    }
    setNotification({ type: 'info', message });
    // TODO: Call email notification API
  };

  // Show recommendations if no peers available
  const noPeersAvailable = filteredPeers.length === 0 && !isPeersLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Chat view
  if (showChat && selectedPeer) {
    console.log("Rendering PeerChat component with peer:", selectedPeer.id);
    return (
      <PeerChat 
        peer={selectedPeer}
        onClose={() => setShowChat(false)}
        initialMessages={chatMessages}
        initialIsAnonymous={isAnonymous}
      />
    );
  }

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Peer Support
          </h1>
          <div className="flex items-center space-x-1">
           {/*<Link href="/peer-support/all-peers" className="text-blue-600 hover:underline flex items-center mr-2">
              <span className="material-icons text-sm mr-1">list</span>
              All Peers
            </Link>*/}
            
            {/* My Chats button with notification count */}
            {isAuthenticated && (
              <>
              <Button 
                onClick={() => setShowMyChatsList(!showMyChatsList)}
                variant={showMyChatsList ? "default" : "outline"}
                className="flex items-center flex-wrap relative"
              >
                <span className="material-icons mr-1">chat</span>
                {myChatsList.length > 0 && (
                  <span className="absolute -top-3 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {myChatsList.length}
                  </span>
                )}
              </Button>
                
                {/* Combined Requests button with notification count */}
                <Button
                  onClick={() => setShowRequests(!showRequests)}
                  variant={showRequests ? "default" : "outline"}
                  className="flex items-center flex-wrap relative"
                >
                  <span className="material-icons mr-1">notifications</span>
                  {totalRequestsCount > 0 && (
                    <span className="absolute -top-3 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {totalRequestsCount}
                    </span>
                  )}
                </Button>
              </>
            )}
            
            {/* Sign up button for guests */}
            {!isAuthenticated && (
              <Button
                onClick={() => router.push('/auth/signup?redirect=peer-support')}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Sign Up
              </Button>
            )}
            
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
                className="flex items-center"
              >
                <span className="material-icons">home</span>
              </Button>
          </div>
        </div>

        {/* Personalized journey-based message */}
        {isAuthenticated && userProfile && personalizedMessage && (
          <div className={`p-5 rounded-xl shadow-sm ${messageStyles.container}`}>
            <h2 className={`text-xl font-semibold mb-2 ${messageStyles.title}`}>
              {personalizedMessage.title}
            </h2>
            <p className={messageStyles.text}>
              {personalizedMessage.description}
            </p>
          </div>
        )}

        {/* View Selector for authenticated users */}
        {isAuthenticated && userProfile && (
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex flex-wrap justify-between items-center">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 mr-2">I want to:</h3>
                <div className="flex flex-wrap gap-2">
                  {userProfile.supportType === 'support-seeker' && (
                    <Button
                      variant={activeView === 'need' ? "default" : "outline"}
                      className="bg-blue-100 text-blue-700 hover:bg-blue-600 hover:text-white"
                    >
                      Get Support
                    </Button>
                  )}
                  
                  {userProfile.supportType === 'support-giver' && (
                    <Button
                      variant={activeView === 'give' ? "default" : "outline"}
                      className="bg-[#F6D2C6] text-blue-700 hover:bg-blue-600 hover:text-white"
                    >
                      Give Support
                    </Button>
                  )}
                
                <Button
                  onClick={() => setShowJourneySelector(!showJourneySelector)}
                  variant="outline"
                  className="flex items-center relative"
                  aria-expanded={showJourneySelector}
                >
                  <span className="material-icons mr-1">tune</span>
                  My Journey
                  {selectedJourneys.length > 0 && (
                    <span className="absolute -top-1 right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
                  )}
                </Button>
              </div>
              </div>
            </div>
                </div>
        )}

           {/* Journey selector modal */}
            {showJourneySelector && (
          <JourneySelector
            journeyOptions={journeyOptions}
            selectedJourneys={selectedJourneys}
            onJourneyToggle={handleJourneyToggle}
            onSave={saveJourneyPreferences}
            onClose={() => setShowJourneySelector(false)}
          />
        )}

        {/* My Chats List */}
        {showMyChatsList && (
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {activeView === 'need' 
                ? 'My Support Providers' 
                : activeView === 'give' 
                  ? 'People I\'m Supporting' 
                  : 'My Peer Conversations'}
            </h2>
            
            {myChatsList.length > 0 ? (
            <div className="space-y-3">
              {myChatsList.map((peer) => (
                <div 
                  key={peer.id}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-blue-200 cursor-pointer"
                  onClick={() => {
                    console.log("Selected chat with peer:", peer.name, peer.id);
                    setSelectedPeer(peer);
                    setShowChat(true);
                    setShowMyChatsList(false);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{peer.avatar}</div>
                    <div>
                      <h3 className="font-medium">{peer.name}</h3>
                      <div className="flex items-center">
                        <p className="text-sm text-gray-500">
                          {peer.isActive ? 'Active now' : 'Last active: Recently'}
                        </p>
                        {peer.supportType === 'support-giver' && (
                          <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                            Provider
                          </span>
                        )}
                        {peer.supportType === 'support-seeker' && (
                          <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                            Seeker
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {peer.isActive && (
                      <span className="h-3 w-3 bg-green-500 rounded-full mr-2"></span>
                    )}
                    {/* <button
                      onClick={(e) => handleDeleteChat(peer, e)}
                      className="text-gray-500 hover:text-red-500 ml-2"
                      title="Delete chat"
                    >
                      <span className="material-icons text-sm">delete</span>
                    </button> */}
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-8">
            <p className="text-gray-500 mb-4">You don't have any active conversations yet</p>
            <Button 
              onClick={() => setShowMyChatsList(false)}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Find Peers to Connect With
            </Button>
              </div>
            )}
          </div>
        )}

        {/* Combined Requests Panel */}
        {showRequests && (
          <div className="bg-white p-5 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Requests
                </h2>
                <div className="flex mt-2">
                  <button
                    onClick={() => setRequestsTab('received')}
                    className={`px-4 py-2 text-sm font-medium ${
                      requestsTab === 'received' 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Received
                    {receivedRequestsCount > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {receivedRequestsCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setRequestsTab('sent')}
                    className={`px-4 py-2 text-sm font-medium ${
                      requestsTab === 'sent' 
                        ? 'text-blue-600 border-b-2 border-blue-600' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Sent
                    {sentRequestsCount > 0 && (
                      <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        {sentRequestsCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              <Button
                onClick={() => setShowRequests(false)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
            
            {/* Show appropriate component based on selected tab */}
            {requestsTab === 'received' ? (
          <SupportRequests
                supportRequests={supportRequestsFromHooks.filter(req => req.receiver_id === user?.id)}
            onAccept={handleAcceptRequest}
            onDecline={handleDeclineRequest}
                onClose={() => setShowRequests(false)}
            activeView={activeView}
          />
            ) : (
              <SentRequests
                sentRequests={supportRequestsFromHooks.filter(req => req.sender_id === user?.id)}
                onCancel={handleCancelRequest}
                onClose={() => setShowRequests(false)}
              />
            )}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {filteredPeers.length} Peers
            </h3>
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowFilterModal(!showFilterModal)}
                variant="outline"
                className="flex items-center"
              >
                <span className="material-icons mr-1">filter_list</span>
                Filter
              </Button>
              <Button
                onClick={() => setShowSortOptions(!showSortOptions)}
                variant="outline"
                className="flex items-center"
              >
                <span className="material-icons mr-1">sort</span>
                Sort
              </Button>
            </div>
          </div>
          
          {showFilterModal && (
            <div className="mt-4 p-4 border border-gray-100 rounded-lg">
              <h4 className="font-medium mb-3">Filter Options</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeOnlyFilter === true}
                      onChange={() => setActiveOnlyFilter(activeOnlyFilter === true ? null : true)}
                      className="rounded text-blue-500 mr-2"
                    />
                    <span>Active now only</span>
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {showSortOptions && (
            <div className="mt-4 p-4 border border-gray-100 rounded-lg">
              <h4 className="font-medium mb-3">Sort By</h4>
              <div className="space-y-2">
                {[
                  { id: 'match', label: 'Best Match' },
                  { id: 'rating', label: 'Highest Rating' },
                  { id: 'peopleSupported', label: 'Most People Supported' },
                  { id: 'availability', label: 'Availability' }
                ].map(option => (
                  <div key={option.id} className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={sortBy === option.id}
                        onChange={() => setSortBy(option.id as any)}
                        className="text-blue-500 mr-2"
                      />
                      <span>{option.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

          {filteredPeers.length === 0 && (
                      <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center mb-6">
                        <h2 className="text-2xl font-bold mb-2 text-blue-700">No Peers Available Right Now</h2>
                        <p className="mb-4 text-gray-600 text-center max-w-lg">
                          While we look for a match, try these recommended tools to support your well-being:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                          <button
                            className="bg-blue-50 hover:bg-blue-100 rounded-lg p-4 flex flex-col items-center shadow transition"
                            onClick={() => setShowAISuggestions(true)}
                          >
                            <span className="material-icons text-4xl text-blue-500 mb-2">smart_toy</span>
                            <span className="font-semibold">AI Companion</span>
                            <span className="text-xs text-gray-500 mt-1">Chat with our AI for support</span>
                          </button>
                          <button
                            className="bg-green-50 hover:bg-green-100 rounded-lg p-4 flex flex-col items-center shadow transition"
                            onClick={() => setShowAffirmations(true)}
                          >
                            <span className="material-icons text-4xl text-green-500 mb-2">self_improvement</span>
                            <span className="font-semibold">Affirmations</span>
                            <span className="text-xs text-gray-500 mt-1">Boost your mood with positive affirmations</span>
                          </button>
                          <button
                            className="bg-yellow-50 hover:bg-yellow-100 rounded-lg p-4 flex flex-col items-center shadow transition"
                            onClick={() => setShowFocusTimer(true)}
                          >
                            <span className="material-icons text-4xl text-yellow-500 mb-2">timer</span>
                            <span className="font-semibold">Focus Timer</span>
                            <span className="text-xs text-gray-500 mt-1">Practice mindful focus and breathing</span>
                          </button>
                          <button
                            className="bg-pink-50 hover:bg-pink-100 rounded-lg p-4 flex flex-col items-center shadow transition"
                            onClick={() => setShowGratitude(true)}
                          >
                            <span className="material-icons text-4xl text-pink-500 mb-2">favorite</span>
                            <span className="font-semibold">Gratitude Journal</span>
                            <span className="text-xs text-gray-500 mt-1">Reflect on what you're grateful for</span>
                          </button>
                          <button
                            className="bg-purple-50 hover:bg-purple-100 rounded-lg p-4 flex flex-col items-center shadow transition"
                            onClick={() => setShowJournal(true)}
                          >
                            <span className="material-icons text-4xl text-purple-500 mb-2">edit_note</span>
                            <span className="font-semibold">Journal</span>
                            <span className="text-xs text-gray-500 mt-1">Write your thoughts and feelings</span>
                          </button>
                          <button
                            className="bg-cyan-50 hover:bg-cyan-100 rounded-lg p-4 flex flex-col items-center shadow transition"
                            onClick={() => setShowBreathe(true)}
                          >
                            <span className="material-icons text-4xl text-cyan-500 mb-2">air</span>
                            <span className="font-semibold">Quick Breathe</span>
                            <span className="text-xs text-gray-500 mt-1">Take a calming breathing break</span>
                          </button>
                          <button
                            className="bg-orange-50 hover:bg-orange-100 rounded-lg p-4 flex flex-col items-center shadow transition"
                            onClick={() => setShowStrengths(true)}
                          >
                            <span className="material-icons text-4xl text-orange-500 mb-2">emoji_events</span>
                            <span className="font-semibold">Strengths Tracker</span>
                            <span className="text-xs text-gray-500 mt-1">Track and celebrate your strengths</span>
                          </button>
                          <a
                            href="/resources"
                            className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 flex flex-col items-center shadow transition"
                          >
                            <span className="material-icons text-4xl text-gray-500 mb-2">support_agent</span>
                            <span className="font-semibold">Helpline & Resources</span>
                            <span className="text-xs text-gray-500 mt-1">Find professional help and hotlines</span>
                          </a>
                          </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPeers.map(peer => (
            <PeerCard
                key={peer.id}
              peer={peer}
              userPreferences={userProfile?.supportPreferences}
              onConnect={handleConnect}
              onMessage={handleOpenChat}
              isAuthenticated={isAuthenticated}
              sentRequests={sentRequestsIdsFromHooks}
              acceptedConnections={acceptedConnectionIdsFromHooks}
              isSubmitting={isSendingRequest}
            />
                      ))}
                    </div>

        {/* Get more relevant matches banner */}
        {showRelevantMatchesBanner && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <div className="flex items-start">
              <span className="material-icons text-blue-500 text-xl mr-3">lightbulb</span>
              <div className="flex-1">
                <p className="text-blue-800">
                  Improve your match quality by completing additional profile information.
                </p>
                <div className="mt-3">
                  <Button 
                    onClick={() => router.push('/profile')}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                    size="sm"
                  >
                    Get More Relevant Matches
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification */}
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}

        {showAISuggestions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full relative">
              <button onClick={() => setShowAISuggestions(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
              <AICompanion />
            </div>
          </div>
        )}
        {showAffirmations && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <button onClick={() => setShowAffirmations(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
              <EnhancedAffirmations onClose={() => setShowAffirmations(false)} />
          </div>
        )}
        {showFocusTimer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <button onClick={() => setShowFocusTimer(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
              <EnhancedFocusTimer onClose={() => setShowFocusTimer(false)} />
          </div>
        )}
        {showGratitude && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <button onClick={() => setShowGratitude(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
              <EnhancedGratitudeJournal onClose={() => setShowGratitude(false)} />
          </div>
        )}
        {showJournal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <button onClick={() => setShowJournal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
              <EnhancedJournal onClose={() => setShowJournal(false)} />
          </div>
        )}
        {showBreathe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <button onClick={() => setShowBreathe(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
              <QuickBreathe onClose={() => setShowBreathe(false)} />
          </div>
        )}
        {showStrengths && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
              <button onClick={() => setShowStrengths(false)} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
              <StrengthsTracker onClose={() => setShowStrengths(false)} />
          </div>
        )}
      </div>
    </div>
  );
}