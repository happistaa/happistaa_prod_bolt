export interface PeerMatch {
  id: string;
  name: string;
  avatar: string;
  matchScore: number;
  supportPreferences: string[];
  supportType: 'support-giver' | 'support-seeker';
  location: string;
  isActive: boolean;
  rating: number;
  totalRatings: number;
  certifiedMentor: boolean;
  peopleSupported?: number;
  journeyNote?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: string | Date;
  isAnonymous: boolean;
  senderId?: string;
  receiverId?: string;
}

export interface SupportRequest {
  id: string; 
  created_at: string;
  sender_id: string;
  receiver_id: string;
  receiver_name?: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  is_anonymous: boolean;
  sender?: {
    name: string;
    avatar_url: string;
    support_preferences: string[];
    location: string;
    journey_note: string;
  };
  receiver?: {
    name: string;
    avatar_url: string;
    support_preferences: string[];
    location: string;
  };
}

export interface PeerFilters {
  supportType?: string;
  supportPreferences?: string[];
  activeOnly?: boolean | null;
  sortBy?: 'match' | 'rating' | 'peopleSupported' | 'availability';
  totalCount?: number;
}
