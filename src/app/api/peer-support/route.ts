import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { normalizePreferences } from '@/lib/peer-support/filters';
import { calculateMatchScore, sortPeers, filterPeers } from '@/lib/peer-support/matching';
import { transformProfilesToMatches } from '@/lib/peer-support/transformers';

// Mock data for fallback (abbreviated for brevity)
const mockPeers = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: '👩',
    matchScore: 95,
    supportPreferences: ["Anxiety", "Career Change", "Academic Stress"],
    supportType: 'support-giver',
    location: 'New York',
    isActive: true,
    rating: 4.8,
    totalRatings: 24,
    certifiedMentor: true,
    peopleSupported: 42,
    journeyNote: "Overcame anxiety through mindfulness and career transition. Happy to share my techniques."
  }
];

// Get all available peers or filtered peers based on query parameters
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    
    console.log('Peer support API called with params:', Object.fromEntries(searchParams.entries()));
    
    // Try to get the session from cookies first
    let { data: { session } } = await supabase.auth.getSession();

    // If no session, try bearer token
    if (!session) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const accessToken = authHeader.replace('Bearer ', '').trim();
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        if (user) {
          // Attach token to supabase so that subsequent queries respect RLS policies
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
          session = { user, access_token: accessToken, refresh_token: '' } as any;
        }
      }
    }

    const userId = session?.user?.id || null;
    
    console.log('Current user ID:', userId);
    
    // Get current user's profile for match scoring if authenticated
    let currentUserProfile = null;
    if (userId) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      currentUserProfile = userProfile;
      console.log('Current user profile:', currentUserProfile?.name, currentUserProfile?.support_type);
    }
    
    // Start building the query
    let query = supabase
      .from('profiles')
      .select('*');
    
    // Exclude current user if authenticated
    if (userId) {
      query = query.neq('id', userId);
    }

    // Handle support type filtering
    const supportType = searchParams.get('supportType');
    if (supportType) {
      console.log('Filtering by support type:', supportType);
      if (supportType === 'support-giver' || supportType === 'give') {
        query = query.eq('support_type', 'support-giver');
        console.log('Applied support-giver filter');
      } else if (supportType === 'support-seeker' || supportType === 'need') {
        query = query.eq('support_type', 'support-seeker');
        console.log('Applied support-seeker filter');
      }
    }
    
    // Handle supportPreferences array parameter for filtering by multiple preferences
    const supportPreferencesParam = searchParams.get('supportPreferences');
    if (supportPreferencesParam) {
      try {
        const preferences = JSON.parse(supportPreferencesParam);
        console.log('Filtering by preferences:', preferences);
        
        if (Array.isArray(preferences) && preferences.length > 0) {
          // Get all profiles without any preference filtering first
          const { data: profiles, error } = await query;
          
          if (error) {
            console.error("Error fetching profiles:", error);
            return NextResponse.json({ peers: [] });
          }
          
          if (!profiles || profiles.length === 0) {
            console.log('No profiles found in database');
            return NextResponse.json({ peers: [] });
          }
          
          console.log(`Found ${profiles.length} profiles before preference filtering`);
          
          // Normalize preferences for consistent matching
          const normalizedPreferences = normalizePreferences(preferences);
          const normalizedPreferencesSet = new Set(normalizedPreferences);
          console.log('Normalized preferences set:', Array.from(normalizedPreferencesSet));
          
          // Filter profiles by preferences with flexible matching
          const filteredProfiles = profiles.filter(profile => {
            if (!profile.support_preferences || !Array.isArray(profile.support_preferences)) {
              console.log('Profile has no support preferences:', profile.id);
              return false;
            }
            
            // Normalize profile preferences
            const normalizedProfilePrefs = normalizePreferences(profile.support_preferences);
            console.log(`Profile ${profile.id} preferences:`, normalizedProfilePrefs);
            
            // Check for any overlap between user preferences and profile preferences
              for (const profilePref of normalizedProfilePrefs) {
              if (Array.from(normalizedPreferencesSet).some(userPref => 
                profilePref.includes(userPref) || userPref.includes(profilePref)
              )) {
                console.log(`Profile ${profile.id} matched on preference:`, profilePref);
                  return true;
              }
            }
            
            return false;
          });
          
          console.log(`After preference filtering: ${filteredProfiles.length} profiles`);
          
          // Transform profiles to peer matches using our utility function
          const transformedPeers = transformProfilesToMatches(filteredProfiles, currentUserProfile);
          
          return NextResponse.json({ peers: transformedPeers });
        }
      } catch (e) {
        console.error("Error parsing supportPreferences parameter:", e);
      }
    }

    // Get all filtered peers
    const { data: profiles, error } = await query;
    
    if (error) {
      console.error("Error fetching peers from database:", error);
      // Fall back to mock data if there's an error
      return NextResponse.json({ peers: mockPeers });
    }
    
    // If no profiles found, return empty array
    if (!profiles || profiles.length === 0) {
      console.log('No profiles found in database');
      return NextResponse.json({ peers: [] });
    }
    
    console.log(`Found ${profiles.length} profiles in database`);
    // Log each profile's support type and preferences
    profiles.forEach(profile => {
      console.log(`Profile ${profile.id}: name=${profile.name}, support_type=${profile.support_type}, support_preferences=${JSON.stringify(profile.support_preferences)}`);
    });
    
    // Transform and sort profiles using our utility functions
    const transformedPeers = transformProfilesToMatches(profiles, currentUserProfile);
    console.log(`Transformed ${transformedPeers.length} profiles to peers`);
    
    // Apply any additional client-side filters
    const activeOnly = searchParams.get('activeOnly');
    const additionalFilters = {
      activeOnly: activeOnly ? activeOnly === 'true' : null
    };
    
    const sortByParam = searchParams.get('sortBy') as 'match' | 'rating' | 'peopleSupported' | 'availability' | null;
    
    // Apply client-side filters if needed
    const filteredPeers = activeOnly ? filterPeers(transformedPeers, additionalFilters) : transformedPeers;
    
    // Apply sorting if specified
    const sortedPeers = sortByParam ? sortPeers(filteredPeers, sortByParam) : filteredPeers;
    
    console.log(`Returning ${sortedPeers.length} peers after filtering and sorting`);
    // Log each peer's support type and preferences
    sortedPeers.forEach(peer => {
      console.log(`Peer ${peer.id}: name=${peer.name}, supportType=${peer.supportType}, supportPreferences=${JSON.stringify(peer.supportPreferences)}, isActive=${peer.isActive}`);
    });
    
    return NextResponse.json({ peers: sortedPeers });
    
  } catch (error) {
    console.error('Error in peer-support API:', error);
    // Return mock data as fallback in case of any error
    return NextResponse.json({ peers: mockPeers });
  }
}