   CREATE TABLE profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     name TEXT,
     dob TEXT,
     location TEXT,
     gender TEXT,
     workplace TEXT,
     job_title TEXT,
     education TEXT,
     religious_beliefs TEXT,
     interests TEXT[],
     languages TEXT[],
     availability TEXT,
     preferred_time TEXT,
     communication_style TEXT,
     support_type TEXT,
     avatar_url TEXT,
     completed_setup BOOLEAN DEFAULT FALSE,
     support_seeker BOOLEAN DEFAULT FALSE,
     support_giver BOOLEAN DEFAULT FALSE,
     support_preferences TEXT[],
     journey_note TEXT,
     guidelines_accepted BOOLEAN DEFAULT FALSE
   );
   CREATE TABLE peer_support_chats (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     sender_id UUID REFERENCES auth.users(id) NOT NULL,
     receiver_id UUID REFERENCES auth.users(id) NOT NULL,
     message TEXT NOT NULL,
     is_anonymous BOOLEAN DEFAULT FALSE
   );
   CREATE TABLE support_requests (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     sender_id UUID REFERENCES auth.users(id) NOT NULL,
     receiver_id UUID REFERENCES auth.users(id) NOT NULL,
     message TEXT NOT NULL,
     status TEXT DEFAULT 'pending',
     is_anonymous BOOLEAN DEFAULT FALSE
   );
   -- Enable RLS on all tables
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE peer_support_chats ENABLE ROW LEVEL SECURITY;
   ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

   -- Profiles policies
   CREATE POLICY "Users can view their own profile" 
     ON profiles FOR SELECT 
     USING (auth.uid() = id);

   CREATE POLICY "Users can update their own profile" 
     ON profiles FOR UPDATE 
     USING (auth.uid() = id);

   -- Peer support chats policies
   CREATE POLICY "Users can view chats they're part of" 
     ON peer_support_chats FOR SELECT 
     USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

   CREATE POLICY "Users can create messages" 
     ON peer_support_chats FOR INSERT 
     WITH CHECK (auth.uid() = sender_id);

   -- Support requests policies
   CREATE POLICY "Users can view support requests they're part of" 
     ON support_requests FOR SELECT 
     USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

   CREATE POLICY "Users can create support requests" 
     ON support_requests FOR INSERT 
     WITH CHECK (auth.uid() = sender_id);

   CREATE POLICY "Users can update support requests they received" 
     ON support_requests FOR UPDATE 
     USING (auth.uid() = receiver_id);
   -- Function to create a profile when a user signs up
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.profiles (id, created_at, updated_at)
     VALUES (new.id, now(), now());
     RETURN new;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   -- Trigger to call the function when a user is created
   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();