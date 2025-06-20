import { useState, useCallback } from 'react';
import { PeerMatch, ChatMessage } from '@/types/peer-support';
import { supabase } from '@/lib/supabase';

export function usePeerChat() {
  const [selectedPeer, setSelectedPeer] = useState<PeerMatch | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);

  // Fetch messages for a peer
  const fetchMessages = useCallback(async (peerId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const {
        data: { session: chatSession },
        error: sessionError
      } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw new Error('Authentication error: ' + sessionError.message);
      }
      
      if (!chatSession || !chatSession.access_token) {
        console.error('No auth session or token available');
        throw new Error('You need to be logged in to view messages');
      }

      const response = await fetch(`/api/peer-support/chats?peer_id=${peerId}`, {
        headers: { 
          'Authorization': `Bearer ${chatSession.access_token}` 
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error response:', response.status, errorData);
        throw new Error(`Failed to fetch messages: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform timestamps to Date objects
      const formattedMessages = (data.messages || []).map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      
      setMessages(formattedMessages);
      
      // Update selected peer if provided
      if (data.peer) {
        setSelectedPeer(prevPeer => {
          if (!prevPeer || prevPeer.id !== data.peer.id) {
            return {
              id: data.peer.id,
              name: data.peer.name,
              avatar: data.peer.avatar,
              matchScore: 0,
              supportPreferences: data.peer.experienceAreas || [],
              supportType: data.peer.supportType,
              location: data.peer.location || '',
              isActive: data.peer.isActive || false,
              rating: 0,
              totalRatings: 0,
              certifiedMentor: false
            };
          }
          return prevPeer;
        });
      }
      
      return formattedMessages;
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (receiverId: string, message: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const {
        data: { session: sendSession },
        error: sessionError
      } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw new Error('Authentication error: ' + sessionError.message);
      }
      
      if (!sendSession || !sendSession.access_token) {
        console.error('No auth session or token available');
        throw new Error('You need to be logged in to send messages');
      }
      
      console.log('Sending message with auth token:', sendSession.access_token.substring(0, 10) + '...');

      const response = await fetch('/api/peer-support/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sendSession.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          receiver_id: receiverId,
          message,
          is_anonymous: isAnonymous
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error response:', response.status, errorData);
        throw new Error(`Failed to send message: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Message sent successfully:', data);
      
      // Add the new message to the list with Date object
      const newMessage = {
        ...data.chat,
        timestamp: new Date(data.chat.timestamp)
      };
      
      setMessages(prev => [...prev, newMessage]);
      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAnonymous]);

  // Delete all chat messages with a peer
  const deleteChat = useCallback(async (peerId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Attempting to delete chat with peer: ${peerId}`);
      
      const {
        data: { session: deleteSession },
        error: sessionError
      } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw new Error('Authentication error: ' + sessionError.message);
      }
      
      if (!deleteSession || !deleteSession.access_token) {
        console.error('No auth session or token available');
        throw new Error('You need to be logged in to delete messages');
      }
      
      console.log('Got auth session, sending delete request to API');

      const response = await fetch(`/api/peer-support/chats?peer_id=${peerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${deleteSession.access_token}`
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Server error response:', response.status, errorData);
        throw new Error(`Failed to delete chat: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Delete response:', result);
      
      // Clear messages if the deleted chat was for the currently selected peer
      if (selectedPeer && selectedPeer.id === peerId) {
        console.log('Clearing messages for current peer');
        setMessages([]);
        setSelectedPeer(null);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting chat:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeer]);

  // Initialize chat with a peer
  const initializeChat = useCallback((peer: PeerMatch, initialMessages: ChatMessage[] = []) => {
    setSelectedPeer(peer);
    setMessages(initialMessages);
    
    // Save to localStorage for persistence
    localStorage.setItem('selectedPeer', JSON.stringify(peer));
    localStorage.setItem('chatMessages', JSON.stringify(initialMessages));
    
    // Set up real-time subscription for messages
    const messageSubscription = supabase
      .channel(`peer_chat_${peer.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'peer_support_chats',
        filter: `receiver_id=eq.${peer.id}`
      }, () => {
        // Refresh messages when new ones arrive
        fetchMessages(peer.id);
      })
      .subscribe();
      
    return () => {
      messageSubscription.unsubscribe();
    };
  }, [fetchMessages]);

  return {
    selectedPeer,
    messages,
    isLoading,
    error,
    isAnonymous,
    setIsAnonymous,
    fetchMessages,
    sendMessage,
    deleteChat,
    initializeChat,
    setSelectedPeer
  };
}
