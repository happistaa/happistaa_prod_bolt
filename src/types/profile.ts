import { Database } from '@/lib/supabase/schema';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export interface UserProfile {
  name: string;
  dateOfBirth: string;
  location: string;
  gender: string;
  workplace: string;
  jobTitle: string;
  education: string;
  religiousBeliefs: string;
  communicationPreferences: string;
  availability: string;
  completedSetup: boolean;
  profileCompletionPercentage: number;
  journey?: string;
  journeyNote?: string;
  supportPreferences?: string[];
  supportGiver?: boolean;
  supportSeeker?: boolean;
  supportType?: string;
  certificationBackground?: string[];
  certifications?: {
    file?: string;
    name?: string;
    issueDate?: string;
    status: 'pending' | 'approved' | 'rejected' | 'none';
  };
}

export interface ProfileContextType {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// Mapping functions between Supabase and application profiles
export function mapSupabaseToAppProfile(profile: ProfileRow): UserProfile {
  return {
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
    supportGiver: profile.support_giver || false,
    supportSeeker: profile.support_seeker || false,
    supportType: profile.support_type || '',
    journeyNote: profile.journey_note || '',
    certifications: {
      status: 'none'
    }
  };
}

export function mapAppToSupabaseProfile(profile: UserProfile, userId: string): Partial<ProfileRow> {
  return {
    id: userId,
    name: profile.name,
    dob: profile.dateOfBirth,
    location: profile.location,
    gender: profile.gender,
    workplace: profile.workplace || null,
    job_title: profile.jobTitle || null,
    education: profile.education || null,
    religious_beliefs: profile.religiousBeliefs || null,
    availability: profile.availability || null,
    communication_style: profile.communicationPreferences || null,
    support_seeker: profile.supportSeeker || false,
    support_giver: profile.supportGiver || false,
    support_preferences: profile.supportPreferences || [],
    support_type: profile.supportType || null,
    journey_note: profile.journeyNote || null,
    completed_setup: profile.completedSetup,
    updated_at: new Date().toISOString()
  };
}

// Helper function to calculate profile completion percentage
function calculateProfileCompletionPercentage(profile: ProfileRow): number {
  const fields = [
    'name', 'dob', 'location', 'gender', 'workplace', 'job_title', 
    'education', 'religious_beliefs', 'communication_style', 'availability'
  ];
  
  let filledCount = 0;
  let totalFields = fields.length;
  
  fields.forEach(field => {
    if (profile[field as keyof ProfileRow]) filledCount++;
  });
  
  return Math.round((filledCount / totalFields) * 100);
} 