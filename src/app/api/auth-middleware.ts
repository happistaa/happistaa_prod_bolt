import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';

/**
 * Middleware to handle authentication for API routes
 * This can be imported and used in any API route
 */
export async function withAuth(
  request: NextRequest, 
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const supabase = createClient();
    
    // Verify authentication
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication error: ' + error.message },
        { status: 401 }
      );
    }
    
    // If we didn't get a session from cookies, try the `Authorization` header
    if (!session) {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const accessToken = authHeader.replace('Bearer ', '').trim();

        try {
          // Create a new authenticated client that we can use for this request
          const apiClient = createSupabaseClient<Database>(
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

          // Validate the token and retrieve the user
          const { data: { user }, error: userError } = await apiClient.auth.getUser();

          if (userError || !user) {
            console.error('Invalid bearer token:', userError?.message);
            return NextResponse.json(
              { error: 'Unauthorized. Invalid token.' },
              { status: 401 }
            );
          }

          console.log('API route: User authenticated via bearer token with ID:', user.id);

          // Call the handler with the authenticated user ID and original request
          return handler(user.id, request);
        } catch (tokenErr) {
          console.error('Error validating bearer token:', tokenErr);
          return NextResponse.json(
            { error: 'Unauthorized. Invalid token.' },
            { status: 401 }
          );
        }
      }

      console.log('No session or bearer token found in API route');
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    console.log('API route: User authenticated with ID:', session.user.id);
    
    // Call the handler with the authenticated user ID from cookie-based session
    return handler(session.user.id, request);
  } catch (err) {
    console.error('Unexpected error in API authentication:', err);
    return NextResponse.json(
      { error: 'Authentication error occurred' },
      { status: 401 }
    );
  }
} 