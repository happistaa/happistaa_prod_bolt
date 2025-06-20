import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PeerMatch } from '@/types/peer-support';
import { ConnectionModal } from './ConnectionModal';

interface PeerCardProps {
  peer: PeerMatch;
  userPreferences?: string[];
  onConnect: (peer: PeerMatch, message: string, isAnonymous: boolean) => void;
  onMessage?: (peer: PeerMatch) => void;
  isAuthenticated: boolean;
  sentRequests?: string[]; // IDs of peers to whom requests have been sent
  acceptedConnections?: string[]; // IDs of peers with accepted connections
  isSubmitting?: boolean;
}

export function PeerCard({ 
  peer, 
  userPreferences = [], 
  onConnect, 
  onMessage,
  isAuthenticated, 
  sentRequests = [], 
  acceptedConnections = [],
  isSubmitting = false 
}: PeerCardProps) {
  const router = useRouter();
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  
  // Check if a request has already been sent to this peer
  const requestSent = sentRequests.includes(peer.id);
  
  // Check if there's an accepted connection with this peer
  const isConnected = acceptedConnections.includes(peer.id);
  
  // Find shared journeys between the user and the peer
  const sharedJourneys = userPreferences
    ? peer.supportPreferences.filter(pref => userPreferences.includes(pref))
    : [];
  
  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isAuthenticated) {
      if (isConnected && onMessage) {
        // If connected, open the chat
        onMessage(peer);
      } else if (!requestSent) {
        // If not connected and no pending request, show connection modal
        setShowConnectionModal(true);
      }
    } else {
      // If not authenticated, redirect to sign up page
      router.push('/auth/signup?redirect=peer-support');
    }
  };
  
  const handleSubmitConnection = (message: string, isAnonymous: boolean) => {
    onConnect(peer, message, isAnonymous);
    setShowConnectionModal(false);
  };
  
  // Determine button text and style based on connection status
  const getButtonText = () => {
    if (!isAuthenticated) return 'Sign Up to Connect';
    if (isConnected) return 'Message';
    if (requestSent) return 'Request Sent';
    return 'Reach Out';
  };
  
  // Determine button class based on status
  const getButtonClass = () => {
    if (!isAuthenticated) return 'bg-blue-500 hover:bg-blue-600';
    if (isConnected) return 'bg-green-500 hover:bg-green-600';
    if (requestSent) return 'bg-gray-400';
    return 'bg-blue-500 hover:bg-blue-600';
  };
  
  // Determine if button should be disabled
  const isButtonDisabled = requestSent || (isSubmitting && !isConnected);
  
  return (
    <>
    <div 
      className="border border-gray-100 rounded-xl p-5 hover:border-blue-200 transition-all card-hover shadow-sm bg-white hover:shadow-md relative"
      onClick={() => router.push(`/peer-support/${peer.id}`)}
      style={{ cursor: 'pointer' }}
    >
      {peer.certifiedMentor && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-md">
          <span className="flex items-center">
            <span className="material-icons text-xs mr-1">recommend</span>
            Certified
          </span>
        </div>
      )}
      
      <div className="flex items-start space-x-4">
        <div className="relative">
          <div className="text-4xl">{peer.avatar}</div>
          {peer.isActive && (
            <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></span>
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center">
                <h3 className="font-semibold text-gray-900 text-xl">{peer.name}</h3>
              </div>
              
              <div className="flex items-center mt-1">
                <span className="text-yellow-500 material-icons text-sm">star</span>
                <span className="text-sm text-gray-700 ml-1">{peer.rating}</span>
                <span className="text-xs text-gray-500 ml-1">({peer.totalRatings} ratings)</span>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-sm text-gray-600">{peer.location}</span>
              </div>
              <span className="text-sm text-gray-600">{peer.peopleSupported} People Supported</span>
            </div>
          </div>
        </div>
      </div>
      
      {peer.journeyNote && (
        <div className="mt-3">
          <p className="text-gray-700 text-sm line-clamp-2">{peer.journeyNote}</p>
        </div>
      )}
      
      <div className="mt-3 flex flex-wrap gap-2">
        {peer.supportPreferences.map((area: string, i: number) => {
          const isShared = userPreferences?.includes(area);
          return (
            <span 
              key={i}
              className={`text-xs px-2 py-1 rounded-full ${
                isShared
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {isShared && <span className="mr-1">✓</span>}
              {area}
            </span>
          );
        })}
      </div>
      
      <div className="mb-2 mt-2 flex justify-between items-center">
        <span className="text-sm text-gray-600">
          {peer.supportType === 'support-giver' ? 'Provides support' : 
           peer.supportType === 'support-seeker' ? 'Needs support' : 
           'Both needs and provides support'}
        </span>
      </div>
      
      <div 
        className="border-t pt-3 md:border-t-0 md:pt-0 md:border-l md:pl-4 flex flex-col justify-center" 
        onClick={(e) => e.stopPropagation()}
      >
        <Button 
          onClick={handleButtonClick}
            className={getButtonClass()}
            disabled={isButtonDisabled}
        >
            {getButtonText()}
        </Button>
      </div>
    </div>
      
      {showConnectionModal && (
        <ConnectionModal
          peer={peer}
          onClose={() => setShowConnectionModal(false)}
          onSubmit={handleSubmitConnection}
          isSubmitting={isSubmitting || false}
          sharedJourneys={sharedJourneys}
        />
      )}
    </>
  );
}
