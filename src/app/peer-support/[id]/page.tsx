'use client'

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { PeerMatch } from '@/types/peer-support';
import { usePeerMatching } from '@/hooks/peer-support/usePeerMatching';
import { usePeerChat } from '@/hooks/peer-support/usePeerChat';
import { ConnectionModal } from '../components/ConnectionModal';
import { useSupportRequests } from '@/hooks/peer-support/useSupportRequests';
import { Notification } from '../components/Notification';

export default function PeerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [peer, setPeer] = useState<PeerMatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean>(false);
  const [showConnectionModal, setShowConnectionModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  
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
    sentRequestsIds,
    acceptedConnectionIds,
    isSubmitting: isSendingRequest,
    createSupportRequest
  } = useSupportRequests();

  useEffect(() => {
    const initializePage = async () => {
      setIsLoading(true);
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);

      // Get user profile if available
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
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
            profileCompletionPercentage: 0, // Calculate if needed
            journey: profile.support_preferences ? profile.support_preferences[0] : '',
            supportPreferences: profile.support_preferences || [],
            supportType: profile.support_type || '',
            journeyNote: profile.journey_note || '',
            certifications: {
              status: 'none'
            }
          };
          
          setUserProfile(mappedProfile);
          setIsProfileComplete(profile.completed_setup !== false);
        }
      } else {
        // For non-authenticated users, check localStorage
        const profileData = localStorage.getItem('userProfile');
        if (profileData) {
          const profile = JSON.parse(profileData);
          setUserProfile(profile);
          setIsProfileComplete(profile.completedSetup !== false);
        }
      }
      
      // Get my chats list if available
      // We're now handling this directly in the connect function
      
      // Try to find the peer in the existing peers list
      if (filteredPeers && filteredPeers.length > 0) {
        const foundPeer = filteredPeers.find(p => p.id === params.id);
        if (foundPeer) {
          setPeer(foundPeer);
          setIsLoading(false);
          return;
        }
      }
      
      // If not found, fetch all peers
      await fetchPeers();
      setIsLoading(false);
    };
    
    initializePage();
  }, [params.id, fetchPeers, filteredPeers]);
  
  // Update peer when peers list changes
  useEffect(() => {
    if (filteredPeers && filteredPeers.length > 0) {
      const foundPeer = filteredPeers.find(p => p.id === params.id);
      if (foundPeer) {
        setPeer(foundPeer);
      }
    }
  }, [filteredPeers, params.id]);

  const handleConnect = async (message: string, isAnonymous: boolean) => {
    if (!peer) return;
    
    // Check if user is authenticated first
    if (!isAuthenticated) {
      router.push('/auth/signup?redirect=peer-support');
      return;
    }
    
    // Then check if profile is complete
    if (!isProfileComplete) {
      router.push('/onboarding/profile-setup');
      return;
    }
    
    try {
      // Create a support request
      await createSupportRequest(peer.id, message, isAnonymous);
      
      // Hide the connection modal
      setShowConnectionModal(false);
      
      // Show notification
      setNotification({
        type: 'success',
        message: `Request sent to ${peer.name}!`
      });
      
      // We'll stay on the page so user can see the notification
    } catch (error) {
      console.error('Error sending connection request:', error);
      setNotification({
        type: 'error',
        message: 'Failed to send request. Please try again.'
      });
    }
  };

  // Handle opening chat with a connected peer
  const handleOpenChat = () => {
    if (!peer) return;
    
    // Get the user's support type
    const supportType = userProfile?.supportType;
    
    // Prepare initial messages based on user type
    const initialMessages = [{
      id: 'system-welcome',
      sender: 'system',
      message: `You are now connected with ${peer.name}. This conversation is private and secure.`,
      timestamp: new Date(),
      isAnonymous: false
    }];
    
    // Add to my chats list if not already there
    const myChatsData = localStorage.getItem('myChats') || '[]';
    const currentChatsList = JSON.parse(myChatsData);
    if (!currentChatsList.some((chat: PeerMatch) => chat.id === peer.id)) {
      const updatedChatsList = [...currentChatsList, peer];
      localStorage.setItem('myChats', JSON.stringify(updatedChatsList));
    }
    
    // Initialize the chat with this peer
    setSelectedPeer(peer);
    initializeChat(peer, initialMessages);
    
    // Redirect to peer support page with chat open
    router.push('/peer-support?chat=open');
  };

  // Find shared journeys between the user and the peer
  const sharedJourneys = userProfile?.supportPreferences && peer
    ? peer.supportPreferences.filter(pref => userProfile.supportPreferences.includes(pref))
    : [];

  // Check if a request has already been sent to this peer
  const requestSent = sentRequestsIds.includes(peer?.id || '');
  
  // Check if there's an accepted connection with this peer
  const isConnected = acceptedConnectionIds.includes(peer?.id || '');

  // Determine button text and style based on connection status
  const getButtonText = () => {
    if (!isAuthenticated) return 'Sign Up to Connect';
    if (isConnected) return 'Message';
    if (requestSent) return 'Request Sent';
    return `Reach Out to ${peer?.name}`;
  };
  
  // Determine button class based on status
  const getButtonClass = () => {
    if (!isAuthenticated) return 'bg-blue-500 hover:bg-blue-600';
    if (isConnected) return 'bg-green-500 hover:bg-green-600';
    if (requestSent) return 'bg-gray-400';
    return 'bg-blue-500 hover:bg-blue-600';
  };
  
  // Determine button action
  const handleButtonClick = () => {
    if (!isAuthenticated) {
      router.push('/auth/signup?redirect=peer-support');
    } else if (isConnected) {
      handleOpenChat();
    } else if (!requestSent) {
      setShowConnectionModal(true);
    }
  };

  if (isLoading || isPeersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!peer) {
    return (
      <div className="min-h-screen gradient-bg p-6">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Friend not found</h1>
          <p className="text-gray-600 mb-6">The friend you're looking for doesn't exist or has been removed.</p>
          <Button 
            onClick={() => router.push('/peer-support')}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Back to Peer Support
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button
            onClick={() => router.push('/peer-support')}
            variant="outline"
            className="flex items-center"
          >
            <span className="material-icons mr-1">arrow_back</span>
            Back
          </Button>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="flex items-center"
          >
            <span className="material-icons">home</span>
          </Button>
        </div>

        {/* Friend Profile Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <div className="text-6xl">{peer.avatar}</div>
                {peer.isActive && (
                  <span className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">{peer.name}</h1>
                  {peer.certifiedMentor && (
                    <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                      Certified
                    </span>
                  )}
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-yellow-500 material-icons text-sm">star</span>
                  <span className="text-sm text-gray-700 ml-1">{peer.rating}</span>
                  <span className="text-xs text-gray-500 ml-1">({peer.totalRatings} ratings)</span>
                  <span className="mx-2 text-gray-300">•</span>
                  <span className="text-sm text-gray-600">{peer.location}</span>
                </div>
                <div className="mt-2">
                  <span className="text-sm text-gray-600">
                    {peer.supportType === 'support-giver' ? 'Provides support' : 
                     peer.supportType === 'support-seeker' ? 'Needs support' : 
                     'Both needs and provides support'}
                  </span>
                  {peer.peopleSupported && (
                    <span className="ml-2 text-sm text-gray-600">
                      • Supported {peer.peopleSupported} people
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Journey Note */}
            {peer.journeyNote && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Journey Note</h2>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-gray-700">{peer.journeyNote}</p>
                </div>
              </div>
            )}

            {/* Experience Areas */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Experience Areas</h2>
              <div className="flex flex-wrap gap-2">
                {peer.supportPreferences.map((area: string, i: number) => {
                  const isShared = userProfile?.supportPreferences?.includes(area);
                  return (
                    <span 
                      key={i}
                      className={`px-3 py-1 rounded-full ${
                        isShared
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {isShared && <span className="mr-1">✓</span>}
                      {area}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Match Score */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Match Score</h2>
              <div className="bg-gray-100 h-4 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#5F9FFF] to-[#8D72E6]" 
                  style={{ width: `${peer.matchScore}%` }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">0%</span>
                <span className="text-xs font-medium text-blue-600">{peer.matchScore}%</span>
                <span className="text-xs text-gray-500">100%</span>
              </div>
            </div>

            {/* Connect Button */}
            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleButtonClick}
                className={`px-8 py-6 text-lg rounded-full ${getButtonClass()}`}
                disabled={requestSent || isSendingRequest}
              >
                {getButtonText()}
              </Button>
            </div>
          </div>
        </div>

        {/* Connection Modal */}
        {showConnectionModal && peer && (
          <ConnectionModal 
            peer={peer}
            onClose={() => setShowConnectionModal(false)}
            onSubmit={handleConnect}
            isSubmitting={isSendingRequest}
            sharedJourneys={sharedJourneys}
          />
        )}

        {/* Notification */}
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </div>
  );
}