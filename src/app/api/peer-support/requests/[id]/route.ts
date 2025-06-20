import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { withAuth } from '../../../auth-middleware';

// Delete a support request (cancel)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async (userId, request) => {
    try {
      const supabase = createClient();
      const requestId = params.id;
      
      console.log('Attempting to delete support request:', requestId);
      
      // Verify the user is the sender of the request before deleting
      const { data: existingRequest, error: fetchError } = await supabase
        .from('support_requests')
        .select('sender_id, status')
        .eq('id', requestId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching support request:', fetchError);
        return NextResponse.json(
          { error: 'Error fetching support request' },
          { status: 500 }
        );
      }
      
      if (existingRequest.sender_id !== userId) {
        console.log('User is not the sender of the request:', {
          requestSenderId: existingRequest.sender_id,
          currentUserId: userId
        });
        return NextResponse.json(
          { error: 'You can only cancel requests you have sent' },
          { status: 403 }
        );
      }
      
      // Only allow canceling pending requests
      if (existingRequest.status !== 'pending') {
        console.log('Cannot cancel non-pending request. Status:', existingRequest.status);
        return NextResponse.json(
          { error: 'Only pending requests can be canceled' },
          { status: 400 }
        );
      }
      
      // Delete the request
      const { error: deleteError } = await supabase
        .from('support_requests')
        .delete()
        .eq('id', requestId);
      
      if (deleteError) {
        console.error('Error deleting support request:', deleteError);
        return NextResponse.json(
          { error: 'Error canceling support request' },
          { status: 500 }
        );
      }
      
      console.log('Support request deleted successfully');
      return NextResponse.json({ 
        message: 'Support request canceled successfully' 
      });
      
    } catch (error) {
      console.error('Error in support request cancel API:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
} 