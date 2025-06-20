import { supabase } from './supabase';
import { createClient } from './supabase-server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { Database } from './supabase';

// Types for mindfulness entries
export type MindfulnessEntryType = 'journal' | 'gratitude' | 'strength';

export interface MindfulnessEntry {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  type: MindfulnessEntryType;
  content: string;
  mood?: string | null;
  category?: string | null;
  is_private: boolean;
  tags?: string[] | null;
}

// Journal entry specific interface
export interface JournalEntry extends Omit<MindfulnessEntry, 'type'> {
  type: 'journal';
  mood: string;
}

// Gratitude entry specific interface
export interface GratitudeEntry extends Omit<MindfulnessEntry, 'type'> {
  type: 'gratitude';
  category: string;
}

// Strength entry specific interface
export interface StrengthEntry extends Omit<MindfulnessEntry, 'type'> {
  type: 'strength';
  category?: string;
}

// Helper function to get the appropriate Supabase client
function getSupabaseClient(authenticatedClient?: any) {
  // If an authenticated client is provided, use it
  if (authenticatedClient) {
    return authenticatedClient;
  }
  
  // Check if we're in a server environment (API route)
  if (typeof window === 'undefined') {
    return createClient();
  }
  // Use client-side Supabase for browser environment
  return supabase;
}

// Create a new mindfulness entry
export async function createMindfulnessEntry(entry: Omit<MindfulnessEntry, 'id' | 'created_at' | 'updated_at'>, authenticatedClient?: any) {
  const now = new Date().toISOString();
  const supabaseClient = getSupabaseClient(authenticatedClient);
  
  const newEntry = {
    ...entry,
    id: uuidv4(),
    created_at: now,
    updated_at: now
  };
  
  const { data, error } = await supabaseClient
    .from('mindfulness_entries')
    .insert(newEntry)
    .select()
    .single();
    
  if (error) {
    console.error('Error creating mindfulness entry:', error);
    throw error;
  }
  
  return data;
}

// Get all mindfulness entries for a user
export async function getMindfulnessEntries(userId: string, type?: MindfulnessEntryType, authenticatedClient?: any) {
  const supabaseClient = getSupabaseClient(authenticatedClient);
  
  let query = supabaseClient
    .from('mindfulness_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (type) {
    query = query.eq('type', type);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching mindfulness entries:', error);
    throw error;
  }
  
  return data as MindfulnessEntry[];
}

// Get a specific mindfulness entry
export async function getMindfulnessEntry(id: string, userId: string, authenticatedClient?: any) {
  const supabaseClient = getSupabaseClient(authenticatedClient);
  
  const { data, error } = await supabaseClient
    .from('mindfulness_entries')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching mindfulness entry:', error);
    throw error;
  }
  
  return data as MindfulnessEntry;
}

// Update a mindfulness entry
export async function updateMindfulnessEntry(id: string, userId: string, updates: Partial<Omit<MindfulnessEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>>, authenticatedClient?: any) {
  const supabaseClient = getSupabaseClient(authenticatedClient);
  
  const { data, error } = await supabaseClient
    .from('mindfulness_entries')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating mindfulness entry:', error);
    throw error;
  }
  
  return data as MindfulnessEntry;
}

// Delete a mindfulness entry
export async function deleteMindfulnessEntry(id: string, userId: string, authenticatedClient?: any) {
  const supabaseClient = getSupabaseClient(authenticatedClient);
  
  const { error } = await supabaseClient
    .from('mindfulness_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error deleting mindfulness entry:', error);
    throw error;
  }
  
  return true;
}

// Helper functions for specific entry types

// Journal entries
export async function createJournalEntry(userId: string, content: string, mood: string, isPrivate: boolean = true, tags?: string[]) {
  return createMindfulnessEntry({
    user_id: userId,
    type: 'journal',
    content,
    mood,
    is_private: isPrivate,
    tags
  });
}

export async function getJournalEntries(userId: string) {
  const entries = await getMindfulnessEntries(userId, 'journal');
  return entries as JournalEntry[];
}

// Gratitude entries
export async function createGratitudeEntry(userId: string, content: string, category: string, isPrivate: boolean = true) {
  return createMindfulnessEntry({
    user_id: userId,
    type: 'gratitude',
    content,
    category,
    is_private: isPrivate
  });
}

export async function getGratitudeEntries(userId: string) {
  const entries = await getMindfulnessEntries(userId, 'gratitude');
  return entries as GratitudeEntry[];
}

// Strength entries
export async function createStrengthEntry(userId: string, content: string, category?: string, isPrivate: boolean = true) {
  return createMindfulnessEntry({
    user_id: userId,
    type: 'strength',
    content,
    category,
    is_private: isPrivate
  });
}

export async function getStrengthEntries(userId: string) {
  const entries = await getMindfulnessEntries(userId, 'strength');
  return entries as StrengthEntry[];
}

// Migration helper to move data from localStorage to Supabase
export async function migrateLocalStorageToSupabase(userId: string) {
  try {
    // Migrate journal entries
    const journalKeys = Object.keys(localStorage).filter(key => key.startsWith('journal_'));
    for (const key of journalKeys) {
      const entries = JSON.parse(localStorage.getItem(key) || '[]');
      for (const entry of entries) {
        await createJournalEntry(
          userId,
          entry.content,
          entry.mood || '😊',
          true,
          entry.tags || []
        );
      }
    }
    
    // Migrate gratitude entries
    const gratitudeEntries = JSON.parse(localStorage.getItem('gratitudeEntries') || '[]');
    for (const entry of gratitudeEntries) {
      await createGratitudeEntry(
        userId,
        entry.content,
        entry.category || 'general',
        true
      );
    }
    
    // Migrate strength entries if they exist
    const strengthEntries = JSON.parse(localStorage.getItem('strengthEntries') || '[]');
    for (const entry of strengthEntries) {
      await createStrengthEntry(
        userId,
        entry.content,
        entry.category,
        true
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error migrating localStorage data to Supabase:', error);
    return false;
  }
} 