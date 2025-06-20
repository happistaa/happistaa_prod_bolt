import { useState, useCallback, useEffect } from 'react';
import { SupportRequest } from '@/types/peer-support';
import { supabase } from '@/lib/supabase';

export function useSupportRequests() {
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [sentRequestsIds, setSentRequestsIds] = useState<string[]>([]);
  const [acceptedConnectionIds, setAcceptedConnectionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication in useSupportRequests...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking authentication:', error);
          setIsAuthenticated(false);
          return;
        }
        
        const isAuth = !!session;
        console.log('Authentication status:', isAuth ? 'Authenticated' : 'Not authenticated');
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          console.log('User authenticated with ID:', session.user.id);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
    
    // Subscribe to auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, !!session);
      setIsAuthenticated(!!session);
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch support requests
  const fetchSupportRequests = useCallback(async (type: 'sent' | 'received' | 'all' = 'all', status?: 'pending' | 'accepted' | 'rejected') => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      console.log('Not authenticated, skipping fetch');
      return [];
    }
    
    try {
      console.log(`Fetching ${type} support requests with status: ${status || 'all'}`);
      setIsLoading(true);
      setError(null);
      
      // Get the current session to ensure we have fresh auth data
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session found when fetching requests');
        setIsAuthenticated(false);
        return [];
      }
      
      let url = `/api/peer-support/requests?type=${type}`;
      if (status) {
        url += `&status=${status}`;
      }
      
      console.log('Fetching from URL:', url);
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.status === 401) {
        console.log('Authentication error when fetching requests');
        setIsAuthenticated(false);
        return [];
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to fetch support requests');
      }
      
      const data = await response.json();
      console.log(`Received ${data.requests?.length || 0} support requests`);
      const requests = data.requests || [];
      
      // Update our state with the received data
      setSupportRequests(prev => {
        // Merge with existing requests, avoiding duplicates
        const existingIds = new Set(prev.map(req => req.id));
        const newRequests = requests.filter((req: SupportRequest) => !existingIds.has(req.id));
        return [...prev, ...newRequests];
      });
      
      // Update sent request IDs if this is a "sent" type query
      if (type === 'sent' || type === 'all') {
        const sentIds = requests
          .filter((req: SupportRequest) => req.status === 'pending')
          .map((req: SupportRequest) => req.receiver_id);
        setSentRequestsIds(prev => Array.from(new Set([...prev, ...sentIds])));
        
        // Track accepted connections as well
        const acceptedIds = requests
          .filter((req: SupportRequest) => req.status === 'accepted')
          .map((req: SupportRequest) => req.receiver_id);
        setAcceptedConnectionIds(prev => Array.from(new Set([...prev, ...acceptedIds])));
      }
      
      return requests;
    } catch (err) {
      console.error('Error fetching support requests:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Create a support request
  const createSupportRequest = useCallback(async (receiverId: string, message: string, isAnonymous: boolean = false) => {
    // Don't attempt if not authenticated
    if (!isAuthenticated) {
      console.log('Not authenticated, cannot create request');
      return null;
    }
    
    try {
      console.log('Creating support request for receiver:', receiverId);
      setIsSubmitting(true);
      setError(null);
      
      // Get the current session to ensure we have fresh auth data
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No active session found when creating request');
        setIsAuthenticated(false);
        throw new Error('Authentication required');
      }
      
      console.log('Using authenticated session for user:', session.user.id);
      
      const response = await fetch('/api/peer-support/requests', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          receiver_id: receiverId,
          message,
          is_anonymous: isAnonymous
        }),
      });
      
      console.log('Create request response status:', response.status);
      
      if (response.status === 401) {
        console.log('Authentication error when creating request');
        setIsAuthenticated(false);
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response when creating request:', errorText);
        
        // Try to parse the error response
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to create support request');
        } catch (parseError) {
          // If we can't parse the error, just use the raw text
          throw new Error(`Failed to create support request: ${errorText}`);
        }
      }
      
      const data = await response.json();
      console.log('Support request created successfully:', data.message);
      
      // Add the receiver ID to the sent requests list
      setSentRequestsIds(prev => [...prev, receiverId]);
      
      // Refresh the support requests list
      await fetchSupportRequests();
      
      return data.request;
    } catch (err) {
      console.error('Error creating support request:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [isAuthenticated, fetchSupportRequests]);

  // Update a support request (accept/reject)
  const updateSupportRequest = useCallback(async (requestId: string, status: 'accepted' | 'rejected') => {
    // Don't attempt if not authenticated
    if (!isAuthenticated) {
      console.log('Not authenticated, cannot update request');
      return null;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const {
        data: { session: patchSession }
      } = await supabase.auth.getSession();

      const response = await fetch('/api/peer-support/requests', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${patchSession?.access_token || ''}`
        },
        body: JSON.stringify({
          id: requestId,
          status
        }),
      });
      
      if (response.status === 401) {
        console.log('Authentication error when updating request');
        setIsAuthenticated(false);
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        throw new Error('Failed to update support request');
      }
      
      const data = await response.json();
      
      // Update the local state to reflect the change
      setSupportRequests(prev => {
        const updatedRequests = prev.map(req => {
          if (req.id === requestId) {
            // If accepting a request, add to accepted connections
            if (status === 'accepted') {
              setAcceptedConnectionIds(prevIds => [...prevIds, req.sender_id]);
            }
            return { ...req, status };
          }
          return req;
        });
        return updatedRequests;
      });
      
      return data.request;
    } catch (err) {
      console.error('Error updating support request:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Cancel a sent support request
  const cancelSupportRequest = useCallback(async (requestId: string) => {
    // Don't attempt if not authenticated
    if (!isAuthenticated) {
      console.log('Not authenticated, cannot cancel request');
      return false;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const {
        data: { session: deleteSession }
      } = await supabase.auth.getSession();

      // Find the request to get the receiver ID before making the API call
      const requestToCancel = supportRequests.find(req => req.id === requestId);
      if (!requestToCancel) {
        throw new Error('Request not found');
      }
      
      const response = await fetch(`/api/peer-support/requests?id=${requestId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${deleteSession?.access_token || ''}`
        }
      });
      
      if (response.status === 401) {
        console.log('Authentication error when canceling request');
        setIsAuthenticated(false);
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        throw new Error('Failed to cancel support request');
      }
      
      // Remove the request from sentRequestsIds
      setSentRequestsIds(prev => prev.filter(id => id !== requestToCancel.receiver_id));
      
      // Remove the request from the list
      setSupportRequests(prev => prev.filter(req => req.id !== requestId));
      
      // Request to get fresh data after cancellation
      fetchSupportRequests();
      
      return true;
    } catch (err) {
      console.error('Error canceling support request:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, supportRequests, fetchSupportRequests, supabase.auth]);
  
  // Fetch all requests when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Fetch both sent and received requests
      fetchSupportRequests('all');
    } else {
      // Clear data when not authenticated
      setSupportRequests([]);
      setSentRequestsIds([]);
      setAcceptedConnectionIds([]);
    }
  }, [isAuthenticated, fetchSupportRequests]);

  return {
    supportRequests,
    sentRequestsIds,
    acceptedConnectionIds,
    isLoading,
    isSubmitting,
    error,
    isAuthenticated,
    fetchSupportRequests,
    createSupportRequest,
    updateSupportRequest,
    cancelSupportRequest
  };
}
