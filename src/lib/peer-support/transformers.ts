import { PeerMatch } from '@/types/peer-support';

// Transform database profiles to frontend peer matches
export function transformProfilesToMatches(profiles: any[], userProfile: any | null): PeerMatch[] {
  // Transform profiles to peer matches
  const transformedPeers = profiles.map(profile => transformProfileToPeer(profile, userProfile));
  
  // Sort by match score
  transformedPeers.sort((a, b) => b.matchScore - a.matchScore);
  
  return transformedPeers;
}

// Transform a single profile to a peer match
export function transformProfileToPeer(profile: any, userProfile: any | null): PeerMatch {
  // Calculate match score based on shared interests, preferences, etc.
  let matchScore = 50; // Default match score
  
  if (userProfile && userProfile.support_preferences && profile.support_preferences) {
    // Match based on support preferences (experiences/interests)
    const sharedPreferences = userProfile.support_preferences.filter(
      (pref: string) => profile.support_preferences?.includes(pref)
    );
    matchScore += sharedPreferences.length * 10;
    
    // Match based on location
    if (userProfile.location && profile.location && 
        userProfile.location === profile.location) {
      matchScore += 15;
    }
    
    // Match based on availability
    if (userProfile.availability && profile.availability && 
        userProfile.availability === profile.availability) {
      matchScore += 10;
    }
  }
  
  // Normalize score to be between 0-100
  matchScore = Math.min(Math.round(matchScore), 100);
  
  return {
    id: profile.id,
    name: profile.name || 'Anonymous User',
    avatar: profile.avatar_url || '👤', // Use avatar_url if available, otherwise default
    matchScore,
    supportPreferences: profile.support_preferences || [],
    supportType: profile.support_type || '',
    location: profile.location || 'Unknown',
    isActive: profile.last_active_at ? 
      (new Date().getTime() - new Date(profile.last_active_at).getTime() < 3600000) : 
      false, // Consider active if last active within an hour
    rating: profile.rating || 4.5, // Use rating if available, otherwise default
    totalRatings: profile.total_ratings || 0,
    certifiedMentor: profile.certified_mentor || false,
    peopleSupported: profile.people_supported || 0,
    journeyNote: profile.journey_note || undefined
  };
}

// Transform a profile to chat peer format
export function transformProfileToChatPeer(profile: any): any {
  if (!profile) return null;
  
  return {
    id: profile.id,
    name: profile.name || 'Anonymous User',
    avatar: profile.avatar_url || '👤',
    supportType: profile.support_type || 'support-giver',
    experienceAreas: profile.support_preferences || [],
    location: profile.location || 'Unknown',
    isActive: profile.last_active_at ? 
      (new Date().getTime() - new Date(profile.last_active_at).getTime() < 3600000) : 
      false
  };
}

// Format chat messages for frontend
export function formatChatMessages(messages: any[], userId: string, peerProfile: any): any[] {
  return messages?.map(msg => {
    const isSender = msg.sender_id === userId;
    
    return {
      id: msg.id,
      sender: isSender ? 'you' : peerProfile?.name || 'Peer',
      message: msg.message,
      timestamp: msg.created_at,
      isAnonymous: msg.is_anonymous,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id
    };
  }) || [];
}

// Format support requests for frontend
export function formatSupportRequests(requests: any[], userId: string | undefined): any[] {
  return requests?.map(request => {
    const isSender = request.sender_id === userId;
    
     // Handle both direct join and view-based data structures
     const sender = request.sender || {
      name: request.sender_name,
      avatar_url: request.sender_avatar_url,
      support_preferences: request.sender_support_preferences,
      location: request.sender_location,
      journey_note: request.sender_journey_note
    };
    
    const receiver = request.receiver || {
      name: request.receiver_name,
      avatar_url: request.receiver_avatar_url,
      support_preferences: request.receiver_support_preferences,
      location: request.receiver_location
    };
    
    return {
      id: request.id,
      created_at: request.created_at,
      sender_id: request.sender_id,
      receiver_id: request.receiver_id,
      message: request.message,
      status: request.status,
      is_anonymous: request.is_anonymous,
      sender: sender,
      isSender,
      receiver_name: receiver?.name || null
    };
  }) || [];
}
