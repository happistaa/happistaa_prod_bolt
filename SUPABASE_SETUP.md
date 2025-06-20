# Supabase Setup for Happistaa App

This document outlines the steps to set up your Supabase database for the Happistaa app.

## Database Tables and Policies

To set up the database tables and policies for the peer support feature, follow these steps:

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Paste the SQL code from `src/app/api/peer-support/schema.sql`
5. Execute the query

This will create:
- `support_requests` table - For storing peer support requests
- `peer_support_chats` table - For storing chat messages between peers
- Row-level security policies for both tables
- Performance indexes

## Testing the API Endpoints

After setting up the database, you can test the API endpoints:

1. `/api/peer-support` - Gets the list of peers
2. `/api/peer-support/requests` - Manages support requests
3. `/api/peer-support/chats` - Manages chat messages

## Environment Variables

Make sure your `.env.local` file contains the necessary Supabase environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Important Notes

- The Supabase client is used to authenticate users and access the database
- Real-time functionality is enabled for chat messages and support requests
- All tables have proper row-level security to ensure data privacy
- Users can only access their own data or data shared with them 