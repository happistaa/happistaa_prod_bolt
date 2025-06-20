import { createClient } from '@supabase/supabase-js';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string | null
          dob: string | null
          location: string | null
          gender: string | null
          workplace: string | null
          job_title: string | null
          education: string | null
          religious_beliefs: string | null
          interests: string[] | null
          languages: string[] | null
          availability: string | null
          preferred_time: string | null
          communication_style: string | null
          support_type: string | null
          avatar_url: string | null
          completed_setup: boolean
          support_seeker: boolean
          support_giver: boolean
          support_preferences: string[] | null
          journey_note: string | null
          guidelines_accepted: boolean
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          name?: string | null
          dob?: string | null
          location?: string | null
          gender?: string | null
          workplace?: string | null
          job_title?: string | null
          education?: string | null
          religious_beliefs?: string | null
          interests?: string[] | null
          languages?: string[] | null
          availability?: string | null
          preferred_time?: string | null
          communication_style?: string | null
          support_type?: string | null
          avatar_url?: string | null
          completed_setup?: boolean
          support_seeker?: boolean
          support_giver?: boolean
          support_preferences?: string[] | null
          journey_note?: string | null
          guidelines_accepted?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string | null
          dob?: string | null
          location?: string | null
          gender?: string | null
          workplace?: string | null
          job_title?: string | null
          education?: string | null
          religious_beliefs?: string | null
          interests?: string[] | null
          languages?: string[] | null
          availability?: string | null
          preferred_time?: string | null
          communication_style?: string | null
          support_type?: string | null
          avatar_url?: string | null
          completed_setup?: boolean
          support_seeker?: boolean
          support_giver?: boolean
          support_preferences?: string[] | null
          journey_note?: string | null
          guidelines_accepted?: boolean
        }
      }
      mindfulness_entries: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          type: string // 'journal' | 'gratitude' | 'strength'
          content: string
          mood?: string | null
          category?: string | null
          is_private: boolean
          tags?: string[] | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          type: string
          content: string
          mood?: string | null
          category?: string | null
          is_private?: boolean
          tags?: string[] | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          type?: string
          content?: string
          mood?: string | null
          category?: string | null
          is_private?: boolean
          tags?: string[] | null
        }
      }
      peer_support_chats: {
        Row: {
          id: string
          created_at: string
          sender_id: string
          receiver_id: string
          message: string
          is_anonymous: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          sender_id: string
          receiver_id: string
          message: string
          is_anonymous?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          sender_id?: string
          receiver_id?: string
          message?: string
          is_anonymous?: boolean
        }
      }
      support_requests: {
        Row: {
          id: string
          created_at: string
          sender_id: string
          receiver_id: string
          message: string
          status: string
          is_anonymous: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          sender_id: string
          receiver_id: string
          message: string
          status?: string
          is_anonymous?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          sender_id?: string
          receiver_id?: string
          message?: string
          status?: string
          is_anonymous?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
 