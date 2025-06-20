import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session?.user) {
      // Check if profile exists and create it if it doesn't
      const userId = data.session.user.id;
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, created_at')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        // Only attempt to create if profile doesn't exist
        if (profileError.code === 'PGRST116') {
          console.log("Profile doesn't exist in callback, creating a minimal one");
          
          // Prepare minimal profile data
          const profileData = {
            id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            completed_setup: false
          };
          
          // Try to insert the profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert(profileData);
            
          if (insertError) {
            console.error('Error creating profile in auth callback:', insertError);
            
            // If insert fails, attempt to update instead in case profile was created by RLS trigger
            console.log("Attempting to update profile in callback instead...");
            
            // Create a new profile data object without the created_at field
            const updateData = {
              id: userId,
              updated_at: new Date().toISOString(),
              completed_setup: false
            };
            
            const { error: updateError } = await supabase
              .from('profiles')
              .update(updateData)
              .eq('id', userId);
              
            if (updateError) {
              console.error('Error updating profile in auth callback after failed insert:', updateError);
            } else {
              console.log("Successfully updated profile in auth callback after failed insert");
            }
          } else {
            console.log('Successfully created profile in auth callback');
          }
        } else {
          console.error('Error checking profile existence:', profileError);
        }
      } else {
        console.log('Profile already exists in auth callback, skipping creation');
      }
    }
  }

  return NextResponse.redirect(new URL('/onboarding/profile-setup?sync=true', requestUrl.origin));
}
