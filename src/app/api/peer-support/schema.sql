-- Peer Support Tables Schema

-- Support requests table
CREATE TABLE support_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    receiver_id UUID REFERENCES auth.users(id) NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending'::text NOT NULL,
    is_anonymous BOOLEAN DEFAULT false NOT NULL,
    -- Add constraint to prevent duplicate pending requests
    CONSTRAINT unique_pending_request UNIQUE (sender_id, receiver_id, status) 
    WHERE status = 'pending',
    -- Add constraint to ensure valid status
    CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    -- Add constraint to prevent self-requests
    CONSTRAINT no_self_requests CHECK (sender_id != receiver_id)
);


-- Chat messages table
CREATE TABLE IF NOT EXISTS peer_support_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false
);

-- Row Level Security (RLS) policies

-- Support requests policies
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see requests they've sent or received
CREATE POLICY "Users can view their own requests" 
  ON support_requests 
  FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can create requests where they are the sender
CREATE POLICY "Users can create their own requests" 
  ON support_requests 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Users can update requests that were sent to them (accept/reject)
CREATE POLICY "Users can update requests sent to them" 
  ON support_requests 
  FOR UPDATE 
  USING (auth.uid() = receiver_id);

-- Chat messages policies
ALTER TABLE peer_support_chats ENABLE ROW LEVEL SECURITY;

-- Users can only see messages they've sent or received
CREATE POLICY "Users can view their own messages" 
  ON peer_support_chats 
  FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can create messages where they are the sender
CREATE POLICY "Users can create their own messages" 
  ON peer_support_chats 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Users can update their own messages (mark as read)
CREATE POLICY "Users can update their own messages" 
  ON peer_support_chats 
  FOR UPDATE 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS support_requests_sender_id_idx ON support_requests(sender_id);
CREATE INDEX IF NOT EXISTS support_requests_receiver_id_idx ON support_requests(receiver_id);
CREATE INDEX IF NOT EXISTS support_requests_status_idx ON support_requests(status);

CREATE INDEX IF NOT EXISTS peer_support_chats_sender_id_idx ON peer_support_chats(sender_id);
CREATE INDEX IF NOT EXISTS peer_support_chats_receiver_id_idx ON peer_support_chats(receiver_id);
CREATE INDEX IF NOT EXISTS peer_support_chats_conversation_idx ON peer_support_chats(sender_id, receiver_id); 