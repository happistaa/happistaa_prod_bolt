import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { transformProfileToChatPeer, formatChatMessages } from '@/lib/peer-support/transformers';
import { withAuth } from '@/app/api/auth-middleware';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase';

// Get all chat messages between current user and a specific peer
export async function GET(request: NextRequest) {
  return withAuth(request, async (userId, request) => {
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
      
      const { searchParams } = new URL(request.url);
      const peerId = searchParams.get('peer_id');
      
      if (!peerId) {
        return NextResponse.json(
          { error: 'Peer ID is required' },
          { status: 400 }
        );
      }
      
      // Get chat messages between current user and peer
      console.log(`Fetching chat messages between user ${userId} and peer ${peerId}`);
      
      const { data: chatMessages, error: messagesError } = await supabase
        .from('peer_support_chats')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        console.error('Error fetching chat messages:', messagesError);
        return NextResponse.json(
          { error: 'Error fetching chat messages' },
          { status: 500 }
        );
      }
      
      console.log(`Found ${chatMessages?.length || 0} messages between user ${userId} and peer ${peerId}`);
      
      // Get peer information
      const { data: peerProfile, error: peerError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', peerId)
        .single();
      
      if (peerError && peerError.code !== 'PGRST116') { // Not Found error is acceptable
        console.error('Error fetching peer profile:', peerError);
      }
      
      // Mark messages from this peer as read
      if (chatMessages && chatMessages.length > 0) {
        const unreadMessagesIds = chatMessages
          .filter(msg => msg.receiver_id === userId && !msg.is_read)
          .map(msg => msg.id);
          
        if (unreadMessagesIds.length > 0) {
          await supabase
            .from('peer_support_chats')
            .update({ is_read: true })
            .in('id', unreadMessagesIds);
        }
      }
      
      // Format messages for frontend using our utility function
      const formattedMessages = formatChatMessages(chatMessages, userId, peerProfile);
      
      // Format peer info if available using our utility function
      const peer = transformProfileToChatPeer(peerProfile);
      
      console.log(`Returning ${formattedMessages.length} formatted messages to client`);
      
      return NextResponse.json({ 
        messages: formattedMessages,
        peer
      });
      
    } catch (error) {
      console.error('Error in chat messages API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Send a new chat message
export async function POST(request: NextRequest) {
  return withAuth(request, async (userId, request) => {
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
      
      const { receiver_id, message, is_anonymous = false } = await request.json();
      
      if (!receiver_id || !message) {
        return NextResponse.json(
          { error: 'Receiver ID and message are required' },
          { status: 400 }
        );
      }
      
      // Check if there's an accepted request from current user to peer
      const { data: sentRequests, error: sentRequestError } = await supabase
        .from('support_requests')
        .select('*')
        .eq('sender_id', userId)
        .eq('receiver_id', receiver_id)
        .eq('status', 'accepted');
      
      // Check if there's an accepted request from peer to current user
      const { data: receivedRequests, error: receivedRequestError } = await supabase
        .from('support_requests')
        .select('*')
        .eq('sender_id', receiver_id)
        .eq('receiver_id', userId)
        .eq('status', 'accepted');
      
      // Combine the results
      const requests = [...(sentRequests || []), ...(receivedRequests || [])];
      
      if ((!sentRequestError || !receivedRequestError) && requests.length > 0) {
        // If this is a new conversation, check if there's an accepted request
        if (requests.length === 0) {
          // Auto-create an accepted request
          await supabase
            .from('support_requests')
            .insert({
              sender_id: userId,
              receiver_id,
              message: 'Initiated conversation',
              status: 'accepted',
              is_anonymous
            });
        }
      }
      
      // Insert the new message
      const { data, error } = await supabase
        .from('peer_support_chats')
        .insert({
          sender_id: userId,
          receiver_id,
          message,
          is_anonymous,
          is_read: false
        })
        .select();
      
      if (error) {
        console.error('Error sending message:', error);
        return NextResponse.json(
          { error: 'Error sending message: ' + error.message },
          { status: 500 }
        );
      }
      
      // Format the chat message for response
      const chatMessage = {
        id: data[0].id,
        sender: 'you',
        message: data[0].message,
        timestamp: data[0].created_at,
        isAnonymous: data[0].is_anonymous,
        senderId: data[0].sender_id,
        receiverId: data[0].receiver_id
      };
      
      return NextResponse.json({ 
        message: 'Message sent successfully',
        chat: chatMessage
      });
      
    } catch (error) {
      console.error('Error in chat messages API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

// Delete all chat messages between current user and a specific peer
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (userId, request) => {
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
      
      const { searchParams } = new URL(request.url);
      const peerId = searchParams.get('peer_id');
      
      if (!peerId) {
        return NextResponse.json(
          { error: 'Peer ID is required' },
          { status: 400 }
        );
      }
      
      console.log(`Attempting to delete chat messages between user ${userId} and peer ${peerId}`);
      
      // Correctly delete messages where the user is either the sender or receiver
      const { data, error } = await supabase
        .from('peer_support_chats')
        .delete()
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`)
        .select(); // Use .select() to get the deleted rows
      
      if (error) {
        console.error('Error deleting chat messages:', error);
        return NextResponse.json(
          { error: 'Error deleting chat messages' },
          { status: 500 }
        );
      }
      
      if (!data || data.length === 0) {
        console.warn(`No chat messages found to delete between user ${userId} and peer ${peerId}.`);
        // Still return success, as the desired state is achieved.
      } else {
        console.log(`Successfully deleted ${data.length} chat messages.`);
      }
      
      // Check if there's an accepted request between these users
      const { data: requests, error: requestError } = await supabase
        .from('support_requests')
        .select('*')
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`)
        .eq('status', 'accepted');
      
      if (!requestError && requests && requests.length > 0) {
        // Update the request status to completed
        await supabase
          .from('support_requests')
          .update({ status: 'completed' })
          .eq('id', requests[0].id);
      }
      
      return NextResponse.json({ 
        message: 'Chat deleted successfully'
      });
      
    } catch (error) {
      console.error('Error in chat deletion API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
