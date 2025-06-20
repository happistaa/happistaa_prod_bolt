import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { withAuth } from '../auth-middleware';
import { Database } from '@/lib/supabase';
import { 
  createMindfulnessEntry, 
  getMindfulnessEntries,
  getMindfulnessEntry,
  updateMindfulnessEntry,
  deleteMindfulnessEntry,
  MindfulnessEntry
} from '@/lib/mindfulness';

// GET handler to fetch mindfulness entries
export async function GET(req: NextRequest) {
  return withAuth(req, async (userId, request) => {
    try {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
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

      const url = new URL(request.url);
      
      // Handle single entry fetch
      const entryId = url.searchParams.get('id');
      if (entryId) {
        const entry = await getMindfulnessEntry(entryId, userId, supabase);
        return NextResponse.json(entry);
      }
      
      // Handle filtered entries fetch
      const type = url.searchParams.get('type') as 'journal' | 'gratitude' | 'strength' | null;
      const entries = await getMindfulnessEntries(userId, type || undefined, supabase);
      
      return NextResponse.json(entries);
    } catch (error: any) {
      console.error('Error fetching mindfulness entries:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
}

// POST handler to create a new mindfulness entry
export async function POST(req: NextRequest) {
  return withAuth(req, async (userId, request) => {
    try {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
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

      const body = await request.json();
      
      // Ensure user_id is set correctly
      body.user_id = userId;
      
      const entry = await createMindfulnessEntry(body, supabase);
      
      return NextResponse.json(entry, { status: 201 });
    } catch (error: any) {
      console.error('Error creating mindfulness entry:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
}

// PUT handler to update an existing mindfulness entry
export async function PUT(req: NextRequest) {
  return withAuth(req, async (userId, request) => {
    try {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
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

      const body = await request.json();
      
      if (!body.id) {
        return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
      }
      
      const entry = await updateMindfulnessEntry(body.id, userId, body, supabase);
      
      return NextResponse.json(entry);
    } catch (error: any) {
      console.error('Error updating mindfulness entry:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
}

// DELETE handler to delete a mindfulness entry
export async function DELETE(req: NextRequest) {
  return withAuth(req, async (userId, request) => {
    try {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
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

      const url = new URL(request.url);
      const entryId = url.searchParams.get('id');
      
      if (!entryId) {
        return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
      }
      
      await deleteMindfulnessEntry(entryId, userId, supabase);
      
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting mindfulness entry:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  });
} 