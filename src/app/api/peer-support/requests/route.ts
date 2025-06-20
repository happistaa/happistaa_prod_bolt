import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js'; // Import directly from @supabase/supabase-js
import { formatSupportRequests } from '@/lib/peer-support/transformers'; // Keep existing imports
import { withAuth } from '../../auth-middleware'; // Keep existing imports
import { Database } from '@/lib/supabase'; // Import your Database type

// Get all support requests for the current user
export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, request) => {
    try {

      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      const accessToken = authHeader?.replace('Bearer ', '').trim();

      if (!accessToken) {
        // This case should ideally be handled by your `withAuth` middleware before reaching here.
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // Create a Supabase client that is authenticated for this request using the Bearer token.
      // This is crucial for RLS to recognize auth.uid() based on the incoming request.
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

      const { searchParams } = new URL(request.url);
      const type = searchParams.get('type') || 'all';
      
      // Build query based on request type
      let query = supabase.from('support_requests').select(`
        id, 
        created_at, 
        sender_id, 
        receiver_id, 
        message, 
        status, 
        is_anonymous,
        profiles!sender_id(name, avatar_url, support_preferences, location, journey_note),
        receiver:profiles!receiver_id(name, avatar_url, support_preferences, location)
       `);
      
      if (type === 'sent') {
        // Get requests sent by the user
        query = query.eq('sender_id', userId);
      } else if (type === 'received') {
        // Get requests received by the user
        query = query.eq('receiver_id', userId);
      } else {
        // Get all requests involving the user
        query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      }
      
      // Filter by status if provided
      const status = searchParams.get('status');
      if (status) {
        query = query.eq('status', status);
      }
      
      // Order by created_at
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching support requests:', error);
        return NextResponse.json(
          { error: 'Error fetching support requests' },
          { status: 500 }
        );
      }
      
      // Format support requests using our utility function
      const formattedRequests = formatSupportRequests(data || [], userId);
      
      return NextResponse.json({ requests: formattedRequests });
      
    } catch (error) {
      console.error('Error in support requests API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

//create a support request
export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, request) => {
    try {
      
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      const accessToken = authHeader?.replace('Bearer ', '').trim();

      if (!accessToken) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

      // IMPORTANT: Create a Supabase client that is authenticated for this request using the Bearer token.
      // This is crucial for RLS to recognize auth.uid() based on the incoming request.
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
      // Instead of setting session, use the access token directly in the request
      const { receiver_id, message, is_anonymous = false } = await request.json();
      
      if (!receiver_id || !message) {
        return NextResponse.json(
          { error: 'Receiver ID and message are required' },
          { status: 400 }
        );
      }
      
      console.log('Creating support request:', { 
        sender_id: userId, 
        receiver_id, 
        message: message.substring(0, 20) + '...',
        is_anonymous 
      });
      
      // First check if receiver exists
      const { data: receiver, error: receiverError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', receiver_id)
        .single();
        
      if (receiverError || !receiver) {
        console.error('Receiver not found:', receiverError);
        return NextResponse.json(
          { error: 'Receiver not found' },
          { status: 400 }
        );
      }
      
      // Check for existing active request (pending or accepted) in either direction
      const { data: existingRequests, error: existingError } = await supabase
        .from('support_requests')
        .select('id, status')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${userId})`)
        .in('status', ['pending', 'accepted']);
        
      if (existingError) {
        console.error('Error checking existing requests:', existingError);
        return NextResponse.json(
          { error: 'Error checking existing requests' },
          { status: 500 }
        );
      }
      
      if (existingRequests && existingRequests.length > 0) {
        const activeRequest = existingRequests[0];
        
        if (activeRequest.status === 'pending') {
          return NextResponse.json(
            { error: 'There is already a pending request between you and this user' },
          { status: 400 }
        );
        } else if (activeRequest.status === 'accepted') {
          return NextResponse.json(
            { error: 'You are already connected with this user' },
            { status: 400 }
          );
        }
      }
      
      // Insert the support request with the access token in the headers
      const { data, error } = await supabase
        .from('support_requests')
        .insert({
          sender_id: userId,
          receiver_id,
          message,
          status: 'pending',
          is_anonymous
        })
        .select();
      
      if (error) {
        console.error('Error creating support request:', error);
        
        // Check if this is an RLS policy violation
        if (error.code === '42501' && error.message.includes('row-level security')) {
          console.log('RLS policy violation. Checking auth status...');
          const { data: authData } = await supabase.auth.getUser();
          console.log('Current auth user:', authData?.user?.id, 'Expected user:', userId);
          
          return NextResponse.json(
            { error: `Authentication error: Row-level security policy violation. Please try again or log out and log back in.` },
            { status: 403 }
          );
        }
        
        return NextResponse.json(
          { error: `Error creating support request: ${error.message}` },
          { status: 500 }
        );
      }
      
      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: 'Failed to create support request' },
          { status: 500 }
        );
      }
      
      // Now fetch the full request with profile data
      const { data: fullRequest, error: fetchError } = await supabase
        .from('support_requests')
        .select(`
          id, 
          created_at, 
          sender_id, 
          receiver_id, 
          message, 
          status, 
          is_anonymous,
          sender:profiles!sender_id(name, avatar_url, support_preferences, location, journey_note),
          receiver:profiles!receiver_id(name, avatar_url, support_preferences, location)
        `)
        .eq('id', data[0].id)
        .single()
        ;
      
      if (fetchError) {
        console.error('Error fetching created request:', fetchError);
        // Return the basic request data if we can't fetch the full data
        return NextResponse.json({ 
          message: 'Support request sent successfully',
          request: data[0]
        });
      }
      
      // Format the request for the client
      const formattedRequest = formatSupportRequests([fullRequest], userId)[0];
      
      console.log('Support request created successfully');
      return NextResponse.json({ 
        message: 'Support request sent successfully',
        request: formattedRequest
      });
      
    } catch (error) {
      console.error('Error in support requests API:', error);
      return NextResponse.json(
        { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  });
}

// Update a support request (accept or reject)
export async function PATCH(request: NextRequest) {
  return withAuth(request, async (userId, request) => {
    try {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      const accessToken = authHeader?.replace('Bearer ', '').trim();

      if (!accessToken) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

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
      const { id, status } = await request.json();
      
      if (!id || !status) {
        return NextResponse.json(
          { error: 'Request ID and status are required' },
          { status: 400 }
        );
      }
      
      // Verify the user is the receiver of the request
      const { data: existingRequest, error: fetchError } = await supabase
        .from('support_requests')
        .select('receiver_id')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching support request:', fetchError);
        return NextResponse.json(
          { error: 'Error fetching support request' },
          { status: 500 }
        );
      }
      
      if (existingRequest.receiver_id !== userId) {
        return NextResponse.json(
          { error: 'You can only update requests sent to you' },
          { status: 403 }
        );
      }
      
      // Update the request
      const { data, error } = await supabase
        .from('support_requests')
        .update({ status })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Error updating support request:', error);
        return NextResponse.json(
          { error: 'Error updating support request' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ 
        message: `Support request ${status}`,
        request: data[0]
      });
      
    } catch (error) {
      console.error('Error in support requests API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Delete a support request (cancel)
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (userId, request) => {
    try {
      const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
      const accessToken = authHeader?.replace('Bearer ', '').trim();

      if (!accessToken) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }

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
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      
      if (!id) {
        return NextResponse.json(
          { error: 'Request ID is required' },
          { status: 400 }
        );
      }
      
      // Verify the user is the sender of the request
      const { data: existingRequest, error: fetchError } = await supabase
        .from('support_requests')
        .select('sender_id, status')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching support request:', fetchError);
        return NextResponse.json(
          { error: 'Error fetching support request' },
          { status: 500 }
        );
      }
      
      if (existingRequest.sender_id !== userId) {
        return NextResponse.json(
          { error: 'You can only cancel requests you sent' },
          { status: 403 }
        );
      }
      
      // Instead of deleting, update the status to 'cancelled'
      const { data, error } = await supabase
        .from('support_requests')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Error cancelling support request:', error);
        return NextResponse.json(
          { error: 'Error cancelling support request' },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ 
        message: 'Support request cancelled successfully',
        request: data[0]
      });
      
    } catch (error) {
      console.error('Error in support requests API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
} 