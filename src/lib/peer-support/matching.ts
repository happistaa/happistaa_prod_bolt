import { PeerMatch } from '@/types/peer-support';

/**
 * Calculate match score between a user profile and a potential peer
 * @param userProfile The current user's profile
 * @param peerProfile The potential peer's profile
 * @returns A match score between 0-100
 */
export function calculateMatchScore(userProfile: any, peerProfile: any): number {
  // Start with a default score
  let matchScore = 50;
  
  if (!userProfile || !peerProfile) {
    return matchScore;
  }
  
  // Match based on support preferences (experiences/interests)
  if (userProfile.support_preferences && peerProfile.support_preferences) {
    const userPrefs = Array.isArray(userProfile.support_preferences) 
      ? userProfile.support_preferences 
      : [];
      
    const peerPrefs = Array.isArray(peerProfile.support_preferences) 
      ? peerProfile.support_preferences 
      : [];
    
    // Find shared preferences
    const sharedPreferences = userPrefs.filter(
      (pref: string) => peerPrefs.includes(pref)
    );
    
    // Add points for each shared preference (max 30 points)
    matchScore += Math.min(sharedPreferences.length * 10, 30);
  }
  
  // Match based on location (15 points)
  if (userProfile.location && peerProfile.location && 
      userProfile.location === peerProfile.location) {
    matchScore += 15;
  }
  
  // Match based on availability (10 points)
  if (userProfile.availability && peerProfile.availability && 
      userProfile.availability === peerProfile.availability) {
    matchScore += 10;
  }
  
  // Normalize score to be between 0-100
  return Math.min(Math.round(matchScore), 100);
}

/**
 * Sort peers by specified criteria
 * @param peers Array of peer matches
 * @param sortBy Sorting criteria
 * @returns Sorted array of peers
 */
export function sortPeers(
  peers: PeerMatch[], 
  sortBy: 'match' | 'rating' | 'peopleSupported' | 'availability' = 'match'
): PeerMatch[] {
  switch (sortBy) {
    case 'rating':
      return [...peers].sort((a, b) => b.rating - a.rating);
      
    case 'peopleSupported':
      return [...peers].sort((a, b) => (b.peopleSupported || 0) - (a.peopleSupported || 0));
      
    case 'availability':
      return [...peers].sort((a, b) => {
        if (a.isActive === b.isActive) {
          return b.matchScore - a.matchScore;
        }
        return a.isActive ? -1 : 1;
      });
      
    case 'match':
    default:
      return [...peers].sort((a, b) => b.matchScore - a.matchScore);
  }
}

/**
 * Filter peers based on specified criteria
 * @param peers Array of peer matches
 * @param filters Filter criteria
 * @returns Filtered array of peers
 */
export function filterPeers(
  peers: PeerMatch[], 
  filters: { 
    activeOnly?: boolean | null;
    supportType?: string;
    supportPreferences?: string[];
  }
): PeerMatch[] {
  let result = [...peers];
  
  // Filter by active status
  if (filters.activeOnly !== null && filters.activeOnly !== undefined) {
    result = result.filter(peer => peer.isActive === filters.activeOnly);
  }
  
  // Filter by support type
  if (filters.supportType) {
    result = result.filter(peer => peer.supportType === filters.supportType);
  }
  
  // Filter by support preferences
  if (filters.supportPreferences && filters.supportPreferences.length > 0) {
    result = result.filter(peer => 
      peer.supportPreferences.some(pref => 
        filters.supportPreferences!.includes(pref)
      )
    );
  }
  
  return result;
}
