'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMindfulness } from '@/hooks/useMindfulness';
import { useAuth } from '@/hooks/useAuth';
import { GratitudeEntry } from '@/lib/mindfulness';

interface EnhancedGratitudeJournalProps {
  onClose: () => void;
}

export default function EnhancedGratitudeJournal({ onClose }: EnhancedGratitudeJournalProps) {
  const { user } = useAuth();
  const { entries, isLoading, createGratitudeEntry, deleteEntry } = useMindfulness({ type: 'gratitude', autoFetch: true });
  const [gratitudeText, setGratitudeText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const gratitudeCategories = [
    { id: 'family', name: 'Family', color: 'bg-pink-100 text-pink-700 border-pink-200' },
    { id: 'work', name: 'Work', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'nature', name: 'Nature', color: 'bg-green-100 text-green-700 border-green-200' },
    { id: 'health', name: 'Health', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { id: 'personal', name: 'Personal', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { id: 'other', name: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  ];
  
  const getCategoryColor = (categoryId: string) => {
    const category = gratitudeCategories.find(c => c.id === categoryId);
    return category ? category.color : 'bg-gray-100 text-gray-700 border-gray-200';
  };
  
  const handleSaveGratitude = async () => {
    if (!gratitudeText.trim() || !selectedCategory) return;
    
    await createGratitudeEntry(gratitudeText, selectedCategory);
    setGratitudeText('');
    setSelectedCategory('');
  };
  
  const handleDeleteGratitude = async (id: string) => {
    await deleteEntry(id);
  };
  
  return (
    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold">Gratitude Journal</h2>
          <p className="text-sm text-gray-500">Practice gratitude daily to improve your wellbeing</p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Add new gratitude */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3">What are you grateful for today?</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {gratitudeCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors border ${
                      selectedCategory === category.id
                        ? category.color + ' font-medium'
                        : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                I am grateful for...
              </label>
              <textarea
                value={gratitudeText}
                onChange={(e) => setGratitudeText(e.target.value)}
                placeholder="Express what you're thankful for today..."
                className="w-full p-3 border border-gray-300 rounded-lg h-32"
              />
            </div>
            
            <Button
              onClick={handleSaveGratitude}
              disabled={!gratitudeText.trim() || !selectedCategory || isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              {isLoading ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </div>
        
        {/* Gratitude entries list */}
        <div>
          <h3 className="font-medium mb-3">Your Gratitude Journal</h3>
          
          {isLoading && entries.length === 0 ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-gray-500">Loading your entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500">You haven't added any gratitude entries yet.</p>
              <p className="text-gray-500 text-sm">Start your gratitude practice today!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(entries as GratitudeEntry[]).map(entry => (
                <div 
                  key={entry.id} 
                  className="border rounded-lg p-4 relative group"
                >
                  <div className="flex items-center mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs ${getCategoryColor(entry.category)}`}>
                      {gratitudeCategories.find(c => c.id === entry.category)?.name || 'Other'}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{entry.content}</p>
                  
                  {/* Delete button (only visible on hover) */}
                  <button
                    onClick={() => handleDeleteGratitude(entry.id)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete entry"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 