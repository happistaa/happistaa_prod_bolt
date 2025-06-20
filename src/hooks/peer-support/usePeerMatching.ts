import { useState, useEffect, useCallback } from 'react';
import { PeerMatch, PeerFilters } from '@/types/peer-support';
import { supabase } from '@/lib/supabase';
import { normalizePreferences } from '@/lib/peer-support/filters';

export function usePeerMatching() {
  const [peers, setPeers] = useState<PeerMatch[]>([]);
  const [filteredPeers, setFilteredPeers] = useState<PeerMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState<boolean>(false);

  // Fetch user profile once on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.id) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (!error && profile) {
            setUserProfile(profile);
          }
        }
        
        setIsProfileLoaded(true);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setIsProfileLoaded(true);
      }
    };
    
    fetchUserProfile();
  }, []);

  // Fetch peers with filters
  const fetchPeers = useCallback(async (filters?: Partial<PeerFilters>) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Build filters based on user profile if not provided
      const finalFilters: Record<string, string> = {};
      
      // Add support type filter based on user's role if not provided
      if (!filters?.supportType && userProfile) {
        const supportType = userProfile.support_type || userProfile.supportType;
        
        if (supportType === 'support-seeker' || supportType === 'I need support') {
          finalFilters.supportType = 'support-giver';
        } else if (supportType === 'support-giver' || supportType === 'I want to provide support') {
          finalFilters.supportType = 'support-seeker';
        }
      } else if (filters?.supportType) {
        finalFilters.supportType = filters.supportType;
      }
      
      // Add support preferences if available
      if (filters?.supportPreferences && filters.supportPreferences.length > 0) {
        finalFilters.supportPreferences = JSON.stringify(
          normalizePreferences(filters.supportPreferences)
        );
      } else if (userProfile) {
        const preferences = userProfile.support_preferences || userProfile.supportPreferences;
        if (preferences && Array.isArray(preferences) && preferences.length > 0) {
          finalFilters.supportPreferences = JSON.stringify(
            normalizePreferences(preferences)
          );
        }
      }
      
      // Build query params
      const params = new URLSearchParams();
      Object.entries(finalFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const {
        data: { session: peerSession }
      } = await supabase.auth.getSession();

      const response = await fetch(`/api/peer-support?${params.toString()}`, {
        headers: peerSession ? { Authorization: `Bearer ${peerSession.access_token}` } : undefined,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch peers');
      }
      
      const data = await response.json();
      
      if (data.peers && Array.isArray(data.peers)) {
        setPeers(data.peers);
        
        // Apply client-side filters
        let result = [...data.peers];
        
         // Filter by active status only if explicitly set to true
          if (filters?.activeOnly === true) {
             result = result.filter(peer => peer.isActive === true);
              console.log(`After active filter: ${result.length} peers`);
          }
        
        // Apply sorting
        if (filters?.sortBy) {
          switch (filters.sortBy) {
            case 'rating':
              result.sort((a, b) => b.rating - a.rating);
              break;
            case 'peopleSupported':
              result.sort((a, b) => (b.peopleSupported || 0) - (a.peopleSupported || 0));
              break;
            case 'availability':
              result.sort((a, b) => {
                if (a.isActive === b.isActive) {
                  return b.matchScore - a.matchScore;
                }
                return a.isActive ? -1 : 1;
              });
              break;
            case 'match':
            default:
              result.sort((a, b) => b.matchScore - a.matchScore);
              break;
          }
        }
        
        setFilteredPeers(result);
      }
    } catch (err) {
      console.error('Error fetching peers:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [userProfile]);

  return {
    peers,
    filteredPeers,
    isLoading,
    error,
    userProfile,
    isProfileLoaded,
    fetchPeers
  };
}
