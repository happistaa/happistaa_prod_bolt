'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useMindfulness } from '@/hooks/useMindfulness';
import { useAuth } from '@/hooks/useAuth';
import { JournalEntry } from '@/lib/mindfulness';

interface EnhancedJournalProps {
  onClose: () => void;
}

export default function EnhancedJournal({ onClose }: EnhancedJournalProps) {
  const { user } = useAuth();
  const { entries, isLoading, createJournalEntry, updateEntry, deleteEntry } = useMindfulness({ type: 'journal', autoFetch: true });
  const [journalText, setJournalText] = useState('');
  const [selectedMood, setSelectedMood] = useState('😊');
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState('');
  const recognitionRef = useRef<any>(null);
  
  const moods = ['😊', '😌', '😐', '😔', '😢'];
  const moodLabels = ['Happy', 'Content', 'Neutral', 'Sad', 'Very Sad'];
  
  const handleSaveJournal = async () => {
    if (!journalText.trim()) return;
    
    await createJournalEntry(journalText, selectedMood);
    setJournalText('');
  };
  
  // Initialize speech recognition
  useEffect(() => {
    // Fix for browser compatibility
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition || 
      (window as any).mozSpeechRecognition || 
      (window as any).msSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        setTranscriptionText(transcript);
        setJournalText(transcript);
                  
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.error('Error restarting speech recognition:', e);
            setIsRecording(false);
          }
        } else {
          // When recording actually ends and we're not trying to restart
          // add the transcribed text to the journal
         /* if (transcriptionText) {
            setJournalText(prev => {
              const separator = prev && !prev.endsWith('\n') ? '\n' : '';
              return prev + separator + transcriptionText;
            });
            setTranscriptionText('');
          } */
        }
      };
    }
    
    return () => {
      if (recognitionRef.current && isRecording) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error('Error stopping speech recognition:', e);
        }
      }
    };
  }, [isRecording, transcriptionText]);

  const startRecording = async () => {
    try {
      if (recognitionRef.current) {
        await recognitionRef.current.start();
        setIsRecording(true);
      } else {
        throw new Error('Speech recognition not supported');
      }
    } catch (error) {
      console.error('Error accessing speech recognition:', error);
      alert('Speech recognition is not available in your browser or requires permission.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDeleteJournal = async (id: string) => {
    await deleteEntry(id);
  };
  
  const handleTogglePrivacy = async (entry: JournalEntry) => {
    await updateEntry(entry.id, { is_private: !entry.is_private });
  };
  
  const handleCopyToClipboard = (text: string, entryId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedEntryId(entryId);
      setTimeout(() => setCopiedEntryId(null), 2000);
    });
  };
  
  return (
    <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold">Journal</h2>
          <p className="text-sm text-gray-500">Express your thoughts and feelings in a safe space</p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-6">
        {/* New journal entry */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3">How are you feeling today?</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
              <div className="flex justify-between items-center bg-white rounded-lg p-2 border border-gray-200">
                {moods.map((mood, index) => (
                  <button
                    key={mood}
                    onClick={() => setSelectedMood(mood)}
                    className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
                      selectedMood === mood
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-2xl">{mood}</span>
                    <span className="text-xs mt-1">{moodLabels[index]}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Write your thoughts
              </label>
              <textarea
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="What's on your mind today?"
                className="w-full p-3 border border-gray-300 rounded-lg h-32"
              />
            </div>
            
            {/* Voice recording section with live transcription */}
            <div className="space-y-2">
              {isRecording && (
                <div className="bg-white p-3 border border-blue-200 rounded-lg text-sm">
                  <div className="flex items-center mb-1">
                    <span className="material-icons mr-2 text-red-500 animate-pulse">mic</span>
                    <span className="font-medium">Recording...</span>
                  </div>
                  
                 {/* <p className="text-gray-700 italic">
                    {transcriptionText || "Speak now..."}
                  </p> */}
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex-1 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                >
                  <span className="material-icons mr-2">
                    {isRecording ? 'stop' : 'mic'}
                  </span>
                  {isRecording ? 'Stop Recording' : 'Voice Entry'}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                onClick={handleSaveJournal}
                disabled={!journalText.trim() || isLoading}
                className="flex-1 bg-blue-500 hover:bg-blue-600"
              >
                {isLoading ? 'Saving...' : 'Save Entry'}
              </Button>
              
              <div className="flex items-center text-xs text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Private by default
              </div>
            </div>
          </div>
        </div>
        
        {/* Journal entries list */}
        <div>
          <h3 className="font-medium mb-3">Your Journal Entries</h3>
          
          {isLoading && entries.length === 0 ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-gray-500">Loading your entries...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-500">You haven't added any journal entries yet.</p>
              <p className="text-gray-500 text-sm">Start journaling today to track your thoughts and feelings.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(entries as JournalEntry[]).map(entry => (
                <div 
                  key={entry.id} 
                  className="border rounded-lg p-4 relative group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{entry.mood}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    
                    {/* Privacy indicator */}
                    <button
                      //onClick={() => handleTogglePrivacy(entry)}
                      className="p-1 rounded-full hover:bg-gray-100"
                     // title={entry.is_private ? "Private entry": "Public entry"}
                     title={ "Private entry"}
                    >
                      {entry.is_private ? (
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  <p className="text-gray-700 whitespace-pre-line">{entry.content}</p>
                  
                  <div className="mt-3 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyToClipboard(entry.content, entry.id)}
                      className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
                      title="Copy to clipboard"
                    >
                      {copiedEntryId === entry.id ? (
                        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteJournal(entry.id)}
                      className="p-1 rounded-full hover:bg-gray-100 text-red-500"
                      title="Delete entry"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 