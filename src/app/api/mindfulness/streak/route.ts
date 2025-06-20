import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { withAuth } from '../../auth-middleware';
import { Database } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, req) => {
    try {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      const accessToken = authHeader?.replace('Bearer ', '').trim();

      if (!accessToken) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Create a Supabase client that is authenticated for this request using the Bearer token
      const supabase = createSupabaseClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      );

      const { activityType } = await req.json();
      
      if (!activityType) {
        return NextResponse.json({ error: 'Activity type is required' }, { status: 400 });
      }
      
      // Get the current date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // First, check if a streak record exists for this user
      const { data: existingStreak, error: fetchError } = await supabase
        .from('mindfulness_streaks')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
        return NextResponse.json({ error: 'Failed to fetch streak data' }, { status: 500 });
      }
      
      let newStreakData;
      
      if (!existingStreak) {
        // Create a new streak record if one doesn't exist
        newStreakData = {
          user_id: userId,
          mindfulness: 1,
          last_updated: new Date().toISOString(),
          last_mindfulness_date: today
        };
        
        const { data, error } = await supabase
          .from('mindfulness_streaks')
          .insert(newStreakData)
          .select();
        
        if (error) {
          return NextResponse.json({ error: 'Failed to create streak record' }, { status: 500 });
        }
        
        return NextResponse.json({ message: 'Streak created', data });
      } else {
        // Update the existing streak
        let updatedStreak = { ...existingStreak };
        
        // Only increment the streak if this is their first activity of the day
        if (updatedStreak.last_mindfulness_date !== today) {
          updatedStreak.mindfulness += 1;
          updatedStreak.last_mindfulness_date = today;
        }
        
        updatedStreak.last_updated = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('mindfulness_streaks')
          .update(updatedStreak)
          .eq('user_id', userId)
          .select();
        
        if (error) {
          return NextResponse.json({ error: 'Failed to update streak record' }, { status: 500 });
        }
        
        return NextResponse.json({ 
          message: 'Streak updated', 
          data: data[0],
          streakIncremented: existingStreak.last_mindfulness_date !== today
        });
      }
    } catch (error) {
      console.error('Error in streak update:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  });
} 