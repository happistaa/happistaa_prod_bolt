import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthState } from '@/types/auth';

export function useAuth(): AuthState & {
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  syncProfileWithSupabase: (userId: string) => Promise<void>;
  fetchAndUpdateUserProfile: (userId: string) => Promise<any>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Add refs to track operations
  const profileFetchedRef = useRef(false);
  const profileOperationInProgressRef = useRef(false);

  // Function to sync localStorage data with Supabase
  const syncProfileWithSupabase = async (userId: string) => {
    // Prevent multiple simultaneous operations
    if (profileOperationInProgressRef.current) {
      console.log("Profile operation already in progress, skipping sync");
      return;
    }
    
    try {
      profileOperationInProgressRef.current = true;
      
      // Get data from localStorage
      const storedProfile = localStorage.getItem('userProfile');
      const supportType = localStorage.getItem('supportType');
      const selectedJourneysJSON = localStorage.getItem('selectedJourneys');
      const journeyNote = localStorage.getItem('journeyNote');
      
      if (!storedProfile && !supportType && !selectedJourneysJSON && !journeyNote) {
        console.log("No localStorage data to sync");
        return;
      }
      
      console.log("Syncing localStorage data with database for user:", userId);
      
      // Check if profile exists in database
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      // Prepare data to update or insert
      const updateData: any = {
        id: userId,
        updated_at: new Date().toISOString()
      };
      
      // Add data from localStorage
      if (storedProfile) {
        const parsedProfile = JSON.parse(storedProfile);
        
        // Map profile data to database fields
        if (parsedProfile.name) updateData.name = parsedProfile.name;
        if (parsedProfile.dateOfBirth) updateData.dob = parsedProfile.dateOfBirth;
        if (parsedProfile.location) updateData.location = parsedProfile.location;
        if (parsedProfile.gender) updateData.gender = parsedProfile.gender;
        if (parsedProfile.workplace) updateData.workplace = parsedProfile.workplace;
        if (parsedProfile.jobTitle) updateData.job_title = parsedProfile.jobTitle;
        if (parsedProfile.education) updateData.education = parsedProfile.education;
        if (parsedProfile.religiousBeliefs) updateData.religious_beliefs = parsedProfile.religiousBeliefs;
        if (parsedProfile.communicationPreferences) updateData.communication_style = parsedProfile.communicationPreferences;
        if (parsedProfile.availability) updateData.availability = parsedProfile.availability;
        if (parsedProfile.supportPreferences) updateData.support_preferences = parsedProfile.supportPreferences;
        if (parsedProfile.journeyNote) updateData.journey_note = parsedProfile.journeyNote;
        if (parsedProfile.supportType) updateData.support_type = parsedProfile.supportType;
        
        // Only set completedSetup if it's not already true in the database
        // For new users or users who haven't completed setup
        if (parsedProfile.completedSetup !== undefined && (!existingProfile || !existingProfile.completed_setup)) {
          updateData.completed_setup = parsedProfile.completedSetup;
        }
      }
      
      // Add support type from localStorage
      if (supportType) {
        updateData.support_type = supportType;
      }
      
      // Add selected journeys from localStorage
      if (selectedJourneysJSON) {
        try {
          const selectedJourneys = JSON.parse(selectedJourneysJSON);
          if (Array.isArray(selectedJourneys) && selectedJourneys.length > 0) {
            updateData.support_preferences = selectedJourneys;
          }
        } catch (e) {
          console.error("Error parsing selected journeys:", e);
        }
      }
      
      // Add journey note from localStorage
      if (journeyNote) {
        updateData.journey_note = journeyNote;
      }
      
      // Update or insert profile data
      if (fetchError || !existingProfile) {
        // Create new profile
        console.log("Creating new profile with localStorage data");
        
        // For new profiles, default completedSetup to false if not specified
        if (updateData.completed_setup === undefined) {
          updateData.completed_setup = false;
        }
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(updateData);
          
        if (insertError) {
          console.error('Error creating profile with localStorage data:', insertError);
        } else {
          console.log("Successfully created profile with localStorage data");
          // Clear localStorage after successful sync
          clearLocalStorageData();
        }
      } else {
        // Update existing profile
        console.log("Updating existing profile with localStorage data");
        
        // If the profile already exists and has completedSetup=true, preserve it
        if (existingProfile.completed_setup === true) {
          console.log("Preserving completed_setup=true for existing user");
          updateData.completed_setup = true;
        }
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);
          
        if (updateError) {
          console.error('Error updating profile with localStorage data:', updateError);
        } else {
          console.log("Successfully updated profile with localStorage data");
          // Clear localStorage after successful sync
          clearLocalStorageData();
        }
      }
    } catch (error) {
      console.error("Error syncing localStorage data with database:", error);
    } finally {
      profileOperationInProgressRef.current = false;
    }
  };

  // Function to fetch profile from Supabase and update localStorage
  const fetchAndUpdateUserProfile = async (userId: string) => {
    // If we already fetched the profile, don't fetch again unless forced
    if (profileFetchedRef.current) {
      console.log("Profile already fetched, using cached data");
      return JSON.parse(localStorage.getItem('userProfile') || 'null');
    }
    
    // Prevent multiple simultaneous operations
    if (profileOperationInProgressRef.current) {
      console.log("Profile operation already in progress, skipping fetch");
      return null;
    }
    
    try {
      profileOperationInProgressRef.current = true;
      console.log("Fetching profile from Supabase for user:", userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching profile from Supabase:', error);
        return null;
      }
      
      if (profile) {
        console.log("Profile found in Supabase:", profile);
        
        // Check if the user has already completed setup
        const hasCompletedSetup = profile.completed_setup === true;
        console.log("User completed setup status:", hasCompletedSetup);
        
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
          completedSetup: hasCompletedSetup, // Ensure we use the correct value
          profileCompletionPercentage: calculateProfileCompletionPercentage(profile),
          journey: profile.support_preferences ? profile.support_preferences[0] : '',
          supportPreferences: profile.support_preferences || [],
          supportType: profile.support_type || '',
          journeyNote: profile.journey_note || '',
          certifications: {
            status: 'none'
          }
        };
        
        // Save to localStorage for backward compatibility
        localStorage.setItem('userProfile', JSON.stringify(mappedProfile));
        localStorage.setItem('profileSetupCompleted', hasCompletedSetup ? 'true' : 'false');
        localStorage.setItem('isAuthenticated', 'true');
        
        // Mark profile as fetched
        profileFetchedRef.current = true;
        
        return mappedProfile;
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching and updating user profile:", error);
      return null;
    } finally {
      profileOperationInProgressRef.current = false;
    }
  };

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

  // Helper function to clear localStorage data after syncing with Supabase
  const clearLocalStorageData = () => {
    // Keep isAuthenticated flag but clear profile data
    localStorage.removeItem('userProfile');
    localStorage.removeItem('supportType');
    localStorage.removeItem('selectedJourneys');
    localStorage.removeItem('journeyNote');
    console.log("Cleared localStorage data after syncing with Supabase");
  };

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          console.log("Auth: User authenticated", session.user.id);
          
          // Check if there's any localStorage data that needs to be synced with the database
          const hasLocalStorageData = localStorage.getItem('userProfile') || 
                                     localStorage.getItem('supportType') || 
                                     localStorage.getItem('selectedJourneys') ||
                                     localStorage.getItem('journeyNote');
          
          if (hasLocalStorageData) {
            // Sync localStorage data with database
            await syncProfileWithSupabase(session.user.id);
          } else if (!profileFetchedRef.current) {
            // If no localStorage data and profile not fetched, fetch profile from Supabase
            await fetchAndUpdateUserProfile(session.user.id);
          }
        } else {
          console.log("Auth: No authenticated user");
        }
      } catch (error) {
        console.error("Error getting auth session:", error);
      } finally {
        setLoading(false);
      }
      
      // Set up auth state listener
      const { data: { subscription } } = await supabase.auth.onAuthStateChange(
        async (_event, session) => {
          console.log("Auth state changed:", _event);
          setSession(session);
          setUser(session?.user || null);
          
          // Only perform profile operations on sign in or token refresh
          if ((_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') && session?.user) {
            // Reset profile fetched flag on sign in
            if (_event === 'SIGNED_IN') {
              profileFetchedRef.current = false;
            }
            
            // Check if there's any localStorage data that needs to be synced with the database
            const hasLocalStorageData = localStorage.getItem('userProfile') || 
                                       localStorage.getItem('supportType') || 
                                       localStorage.getItem('selectedJourneys') ||
                                       localStorage.getItem('journeyNote');
            
            if (hasLocalStorageData) {
              // Sync localStorage data with database
              await syncProfileWithSupabase(session.user.id);
            } else if (!profileFetchedRef.current) {
              // If no localStorage data and profile not fetched, fetch profile from Supabase
              await fetchAndUpdateUserProfile(session.user.id);
            }
          }
          
          setLoading(false);
        }
      );
      
      return () => {
        subscription.unsubscribe();
      };
    };
    
    getSession();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      // If signup was successful and user data is available
      if (result.data.user && !result.error) {
        console.log("Sign up successful, creating or updating profile");
        const userId = result.data.user.id;
        
        // Get any pre-authentication data from localStorage
        const storedProfile = localStorage.getItem('userProfile');
        const supportType = localStorage.getItem('supportType');
        const journeyNote = localStorage.getItem('journeyNote');
        const selectedJourneysJSON = localStorage.getItem('selectedJourneys');
        
        // First check if profile already exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        console.log("Existing profile:", existingProfile);
        // Prepare profile data
        const profileData: any = {
          id: userId,
          updated_at: new Date().toISOString(),
          completed_setup: false // Default for new users
        };
        
        // Add data from localStorage profile if available
        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile);
          
          // Map profile data to database fields
          if (parsedProfile.name) profileData.name = parsedProfile.name;
          if (parsedProfile.dateOfBirth) profileData.dob = parsedProfile.dateOfBirth;
          if (parsedProfile.location) profileData.location = parsedProfile.location;
          if (parsedProfile.gender) profileData.gender = parsedProfile.gender;
          if (parsedProfile.workplace) profileData.workplace = parsedProfile.workplace;
          if (parsedProfile.jobTitle) profileData.job_title = parsedProfile.jobTitle;
          if (parsedProfile.education) profileData.education = parsedProfile.education;
          if (parsedProfile.religiousBeliefs) profileData.religious_beliefs = parsedProfile.religiousBeliefs;
          if (parsedProfile.communicationPreferences) profileData.communication_style = parsedProfile.communicationPreferences;
          if (parsedProfile.availability) profileData.availability = parsedProfile.availability;
          if (parsedProfile.supportPreferences) profileData.support_preferences = parsedProfile.supportPreferences;
          if (parsedProfile.journeyNote) profileData.journey_note = parsedProfile.journeyNote;
          if (parsedProfile.supportType) profileData.support_type = parsedProfile.supportType;
          // Ignore completedSetup from localStorage for new users
        }
        
        // Add support type if available
        if (supportType) {
          profileData.support_type = supportType;
        }
        
        // If supportType is in UI terms ("I need support", "I want to provide support"), 
        // convert to database terms ("support-seeker", "support-giver")
        if (profileData.support_type === "I need support") {
          profileData.support_type = "support-seeker";
        } else if (profileData.support_type === "I want to provide support") {
          profileData.support_type = "support-giver";
        }
        
        // Add journey note if available
        if (journeyNote) {
          profileData.journey_note = journeyNote;
        }
        
        // Add selected journeys if available
        if (selectedJourneysJSON) {
          try {
            const selectedJourneys = JSON.parse(selectedJourneysJSON);
            if (Array.isArray(selectedJourneys) && selectedJourneys.length > 0) {
              profileData.support_preferences = selectedJourneys;
            }
          } catch (e) {
            console.error("Error parsing selected journeys:", e);
          }
        }
        
        try {
          if (fetchError || !existingProfile) {
            // Profile doesn't exist yet, create it with created_at timestamp
            profileData.created_at = new Date().toISOString();
            
           const { error: insertError } = await supabase
              .from('profiles')
              .insert(profileData); 
              
            if (insertError) {
              console.error('Error creating initial profile:', insertError);
              
              // If insert fails, attempt to update instead in case profile was created by RLS trigger
              console.log("Attempting to update profile instead...");
              
              // Create a new profile data object without the created_at field
              const updateData = { ...profileData };
              delete updateData.created_at; // OK to delete from a copy
              
              const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId);
                
              if (updateError) {
                console.error('Error updating profile after failed insert:', updateError);
              } else {
                console.log("Successfully updated profile after failed insert");
              }
            } else {
              console.log("Successfully created initial profile with signup data");
            }
          } else {
            // Profile already exists, update it
            console.log("Profile already exists, updating instead of creating");
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update(profileData)
              .eq('id', userId);
              
            if (updateError) {
              console.error('Error updating existing profile:', updateError);
            } else {
              console.log("Successfully updated existing profile");
            }
          }
          
          // Update localStorage to reflect that setup is not completed
          const storedProfile = localStorage.getItem('userProfile');
          if (storedProfile) {
            const parsedProfile = JSON.parse(storedProfile);
            parsedProfile.completedSetup = false;
            localStorage.setItem('userProfile', JSON.stringify(parsedProfile));
          }
          localStorage.setItem('profileSetupCompleted', 'false');
          
        } catch (error) {
          console.error("Error handling profile during signup:", error);
        }
      }
      
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      // If sign in was successful, fetch or create profile
      if (result.data.user && !result.error) {
        const userId = result.data.user.id;
        
        // First check if user has an existing profile with completedSetup=true
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('completed_setup')
          .eq('id', userId)
          .single();
        
        // Check if there's any localStorage data that needs to be synced
        const hasLocalStorageData = localStorage.getItem('userProfile') || 
                                   localStorage.getItem('supportType') || 
                                   localStorage.getItem('selectedJourneys') ||
                                   localStorage.getItem('journeyNote');
        
        if (hasLocalStorageData) {
          // If user has completed setup, update the localStorage data to reflect this
          if (!profileError && existingProfile && existingProfile.completed_setup) {
            const storedProfile = localStorage.getItem('userProfile');
            if (storedProfile) {
              const parsedProfile = JSON.parse(storedProfile);
              parsedProfile.completedSetup = true;
              localStorage.setItem('userProfile', JSON.stringify(parsedProfile));
              localStorage.setItem('profileSetupCompleted', 'true');
            }
          }
          
          // Sync localStorage data with database
          await syncProfileWithSupabase(userId);
        } else {
          // If no localStorage data, fetch profile from Supabase
          await fetchAndUpdateUserProfile(userId);
        }
      }
      
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      
      // Clear all localStorage data
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userProfile');
      localStorage.removeItem('profileSetupCompleted');
      localStorage.removeItem('supportType');
      localStorage.removeItem('selectedJourneys');
      localStorage.removeItem('journeyNote');
      
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    syncProfileWithSupabase,
    fetchAndUpdateUserProfile
  };
}
