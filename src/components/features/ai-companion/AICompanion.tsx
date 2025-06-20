'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isCrisis?: boolean
}

const quickResponses = [
  "I had a bad day",
  "I feel frustrated",
  "I don't feel good enough",
  "I'm feeling anxious",
  "I am feeling lonely"
]



const crisisResources = [
  {
    name: 'Sneha India',
    number: '044-24640050',
    description: '24/7 support for mental health crises',
    url: 'https://www.snehaindia.org/'
  },
  {
    name: 'Vandrevala Foundation',
    number: '1860-266-2345',
    description: '24/7 text support for any type of crisis',
    url: 'http://www.vandrevalafoundation.com/'
  },
  {
    name: 'Aasra',
    number: '91-22-27546669',
    description: 'For immediate life-threatening emergencies',
    url: 'https://www.aasra.info/'
  },
  {
    name:'Kiran Helpline (Govt. of India)',
    number: '1800-599-0019',
    description: 'Mental Health Rehabilitation',
    url: null

  },
  {
    name:'Fortis Stress Helpline',
    number: '8376804102',
    description: 'For immediate life-threatening emergencies',
    url: 'https://www.fortishealthcare.com/'

  },
  {
    name:'Manas (NIMHANS Digital Academy)',
    number: '91-22-27546669',
    description: 'For immediate life-threatening emergencies',
    url: 'https://nimhansdigitalacademy.in/manas'

  }
]

export default function AICompanion() {
  const [mounted, setMounted] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your Happistaa companion. I'm here to listen and support you. How are you feeling today?",
      timestamp: new Date().toISOString()
    }
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCrisisResources, setShowCrisisResources] = useState(false)
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(true)
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false)
  const [voiceSpeed, setVoiceSpeed] = useState(1.0)
  const [isPaused, setIsPaused] = useState(false)
  const [availableQuickResponses, setAvailableQuickResponses] = useState<string[]>(quickResponses)
  const [useSpeechSynthesis, setUseSpeechSynthesis] = useState(true)
  const [speechErrorShown, setSpeechErrorShown] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const [showSignupPrompt, setShowSignupPrompt] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synthesisRef = useRef<SpeechSynthesis | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [currentSpeakingMessageIndex, setCurrentSpeakingMessageIndex] = useState<number | null>(null)

  // Allow AI companion to be used without authentication
  useEffect(() => {
    // Check if we have already accepted the disclaimer
    const disclaimerAccepted = localStorage.getItem('aiDisclaimerAccepted');
    if (disclaimerAccepted === 'true') {
      setShowDisclaimerModal(false);
    }
  }, []);

  // Initialize component on client-side
  useEffect(() => {
    setMounted(true)
  }, [])

  // Initialize speech recognition
  useEffect(() => {
    if (!mounted) return

    // Fix for browser compatibility
    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition || 
                              (window as any).mozSpeechRecognition || 
                              (window as any).msSpeechRecognition
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('')
        
        setInputText(transcript)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        setIsListening(false)
        setError("I'm having trouble hearing you. Please try speaking again or type your message.")
      }

      recognitionRef.current.onend = () => {
        if (isListening) {
          try {
          recognitionRef.current.start()
          } catch (e) {
            console.error('Error restarting speech recognition:', e)
            setIsListening(false)
          }
        }
      }
    } else {
      console.warn('Speech Recognition API not supported in this browser')
    }

    // Initialize speech synthesis with a delay
    // This helps browsers fully initialize the speech synthesis engine
    let initTimeout: NodeJS.Timeout;
    
    const initSpeechSynthesis = () => {
      synthesisRef.current = window.speechSynthesis;
      
      // Cancel any ongoing speech just to be safe
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      
      // Safari and Chrome need a special handling for voices
      if (typeof window !== 'undefined' && synthesisRef.current) {
        // Force a first call to getVoices to trigger loading
        const voices = synthesisRef.current.getVoices();
        console.log('Initial voices loaded:', voices.length);
        
        // Chrome requires onvoiceschanged
        if (voices.length === 0) {
          synthesisRef.current.onvoiceschanged = () => {
            const loadedVoices = synthesisRef.current?.getVoices() || [];
            console.log('Voices loaded via event:', loadedVoices.length);
          };
          
          // If still no voices after a delay, try another method
          setTimeout(() => {
            if ((synthesisRef.current?.getVoices() || []).length === 0) {
              // Try a different technique to load voices
              const tempUtterance = new SpeechSynthesisUtterance('');
              synthesisRef.current?.speak(tempUtterance);
              synthesisRef.current?.cancel();
              
              // Check if that worked
              setTimeout(() => {
                const forcedVoices = synthesisRef.current?.getVoices() || [];
                console.log('Voices after forcing:', forcedVoices.length);
              }, 200);
            }
          }, 300);
        }
      }
    };
    
    // Delay initialization to let browser fully load
    initTimeout = setTimeout(initSpeechSynthesis, 1000);

    // Cleanup function
    return () => {
      clearTimeout(initTimeout);
      
      if (recognitionRef.current) {
        try {
          if (isListening) {
        recognitionRef.current.stop()
          }
        } catch (e) {
          console.error('Error stopping speech recognition:', e)
        }
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
      }
    }
  }, [mounted, isListening])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (mounted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, mounted])

  // Handle speech errors by disabling speech and showing error
  const handleSpeechError = useCallback((errorMessage: string) => {
    console.error(errorMessage);
    
    // Only show the error once per session to avoid repeated errors
    if (!speechErrorShown) {
      setError(errorMessage);
      setSpeechErrorShown(true);
      
      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
    
    // Disable speech synthesis for this session to prevent repeated errors
    if (useSpeechSynthesis) {
      setUseSpeechSynthesis(false);
    }
  }, [useSpeechSynthesis, speechErrorShown]);

  // Add a simplified speech function as fallback
  const speakWithFallback = useCallback((text: string, messageIndex?: number) => {
    // Try directly without all the complex handling - sometimes simpler is better
    try {
      // Create a simple utterance with minimal properties
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Only set essential event handlers
      utterance.onstart = () => {
        setIsSpeaking(true);
        if (messageIndex !== undefined) {
          setCurrentSpeakingMessageIndex(messageIndex);
        }
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentSpeakingMessageIndex(null);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
        setCurrentSpeakingMessageIndex(null);
        console.log('Speech failed with simplified approach too');
      };
      
      // Speak with the system default voice
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (error) {
      console.error('Even simplified speech failed:', error);
      return false;
    }
  }, []);

  // Helper function to initialize and speak an utterance
  const initAndSpeakUtterance = useCallback((text: string, messageIndex?: number) => {
    if (!synthesisRef.current || !mounted) return;
    
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = voiceSpeed;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

    // Set a more natural voice if available
      const voices = synthesisRef.current.getVoices();
      
      // Verify voices are available
      if (!voices || voices.length === 0) {
        console.warn('No voices available when trying to speak');
        // Try one more direct attempt to get voices
        setTimeout(() => {
          const retryVoices = synthesisRef.current?.getVoices();
          if (retryVoices && retryVoices.length > 0) {
            console.log('Voices loaded on retry in initAndSpeakUtterance');
            // Successfully got voices, try again
            initAndSpeakUtterance(text, messageIndex);
          } else {
            // Still no voices, use fallback with default voice
            applyFallbackVoice(utterance, text, messageIndex);
          }
        }, 300);
        return;
      }
      
      // Try to find a preferred voice
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Female') || voice.name.includes('Samantha')
      );
      
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

      utterance.onstart = () => {
        setIsSpeaking(true);
        if (messageIndex !== undefined) {
          setCurrentSpeakingMessageIndex(messageIndex);
        }
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentSpeakingMessageIndex(null);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis utterance error:', event);
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentSpeakingMessageIndex(null);
        handleSpeechError('Failed to speak the response. Please try again or check your browser settings.');
      };

      // Save reference to control playback
      utteranceRef.current = utterance;
      
      // Use a try/catch when actually speaking
      try {
        synthesisRef.current.speak(utterance);
      } catch (speakError) {
        console.error('Error during speech synthesis speak():', speakError);
        applyFallbackVoice(utterance, text, messageIndex);
      }
    } catch (error) {
      handleSpeechError('Failed to initialize speech. Please try again or check your browser settings.');
    }
  }, [mounted, voiceSpeed, handleSpeechError]);
  
  // Fallback voice function when preferred voices fail
  const applyFallbackVoice = useCallback((utterance: SpeechSynthesisUtterance, text: string, messageIndex?: number) => {
    if (!synthesisRef.current) return;
    
    try {
      // Create a new utterance with minimal settings
      const fallbackUtterance = new SpeechSynthesisUtterance(text);
      // Use default voice and settings
      
      fallbackUtterance.onstart = () => {
        setIsSpeaking(true);
        if (messageIndex !== undefined) {
          setCurrentSpeakingMessageIndex(messageIndex);
        }
      };
      
      fallbackUtterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentSpeakingMessageIndex(null);
      };
      
      fallbackUtterance.onerror = () => {
        handleSpeechError('Speech synthesis failed with fallback voice as well. Text-to-speech has been disabled.');
      };
      
      utteranceRef.current = fallbackUtterance;
      synthesisRef.current.speak(fallbackUtterance);
    } catch (error) {
      // If even the fallback fails, disable speech synthesis
      handleSpeechError('Speech synthesis is not working properly in this browser. Text-to-speech has been disabled.');
    }
  }, [handleSpeechError]);

  const speakText = useCallback((text: string, messageIndex?: number) => {
    if (!synthesisRef.current || !mounted) return
    
    // Skip if speech synthesis has been disabled due to errors
    if (!useSpeechSynthesis) {
      console.log('Speech synthesis is disabled due to previous errors');
      return;
    }
    
    try {
      // Stop any ongoing speech
      synthesisRef.current.cancel()
      setIsPaused(false)

      // Try the simplified approach first as it's more reliable in some browsers
      if (speakWithFallback(text, messageIndex)) {
        // Successfully started speaking with the fallback
        return;
      }

      // If simplified approach fails, try the more complex approach with retries
      // Force getVoices to populate in Safari/Chrome
      if (typeof speechSynthesis !== 'undefined' && speechSynthesis.getVoices().length === 0) {
        // This is a workaround for Chrome/Safari where getVoices() might return empty array
        speechSynthesis.onvoiceschanged = () => {
          // Do nothing, just triggering the event to make voices load
          console.log('Voices changed event triggered');
        };
          
        // Try a direct call to force loading voices
        speechSynthesis.getVoices();
      }

      // Ensure speech synthesis is initialized correctly
      if (synthesisRef.current.getVoices().length === 0) {
        // If voices aren't loaded yet, wait for them to load
        synthesisRef.current.onvoiceschanged = () => {
          initAndSpeakUtterance(text, messageIndex);
        };
        
        // Try to get voices explicitly with retries
        let retryCount = 0;
        const maxRetries = 3;
        const retryVoiceLoading = () => {
          if (synthesisRef.current && synthesisRef.current.getVoices().length === 0 && retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying voice loading (${retryCount}/${maxRetries})...`);
            setTimeout(retryVoiceLoading, 300);
          } else if (synthesisRef.current && synthesisRef.current.getVoices().length > 0) {
            console.log('Voices loaded successfully after retries');
            initAndSpeakUtterance(text, messageIndex);
          } else if (retryCount >= maxRetries) {
            // Try the simplified approach as a last resort
            if (!speakWithFallback(text, messageIndex)) {
              handleSpeechError('Text-to-speech voices not available after multiple attempts. Please check your browser settings.');
            }
          }
        };
        
        retryVoiceLoading();
      } else {
        // Voices are already loaded, proceed normally
        initAndSpeakUtterance(text, messageIndex);
      }
    } catch (error) {
      // Try simplified approach as a fallback before giving up
      if (!speakWithFallback(text, messageIndex)) {
        handleSpeechError('Failed to speak the response. Please try again or check your browser settings.');
      }
    }
  }, [mounted, voiceSpeed, useSpeechSynthesis, handleSpeechError, speakWithFallback, initAndSpeakUtterance]);

  const stopSpeaking = () => {
    if (synthesisRef.current && mounted) {
      synthesisRef.current.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }

  const pauseResumeVoice = () => {
    if (!synthesisRef.current || !mounted) return

    if (synthesisRef.current.speaking) {
      if (synthesisRef.current.paused) {
        // Resume
        synthesisRef.current.resume()
        setIsPaused(false)
      } else {
        // Pause
        synthesisRef.current.pause()
        setIsPaused(true)
      }
    }
  }

  const changeVoiceSpeed = (speed: number) => {
    setVoiceSpeed(speed)
    
    // If currently speaking, apply the new rate
    if (synthesisRef.current && synthesisRef.current.speaking && utteranceRef.current) {
      // Need to restart with new rate since we can't change rate mid-utterance
      const currentText = utteranceRef.current.text
      synthesisRef.current.cancel()
      
      // Small delay to ensure the previous utterance is fully cancelled
      setTimeout(() => {
        speakText(currentText)
      }, 50)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Check if this message is from the quick responses
    const isQuickResponse = availableQuickResponses.includes(message);
    
    // Remove all quick responses if one was used
    if (isQuickResponse) {
      setAvailableQuickResponses([]);
    }

    try {
      setIsLoading(true);
      setError(null);

      // Add user message
      const userMessage: Message = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      setInputText('');

      try {
      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
            throw new Error(errorData.error || `Server responded with status: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.response) {
        throw new Error('No response from AI')
      }

      // Add AI response
      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        isCrisis: data.isCrisis
      }
        setMessages(prev => {
          const newMessages = [...prev, aiMessage]
      // Handle crisis response
      if (data.isCrisis) {
        setShowCrisisResources(true)
        // Speak crisis response with higher priority
            speakText(data.response, newMessages.length - 1)
      } else {
        // Normal response
            speakText(data.response, newMessages.length - 1)
          }
          return newMessages
        })
      } catch (apiError: any) {
        console.error('API Error:', apiError)
        
        // Fallback response if API fails
        const fallbackMessage: Message = {
          role: 'assistant',
          content: "I'm sorry, I'm having trouble connecting to my services. Please try again in a moment or contact support if the issue persists.",
          timestamp: new Date().toISOString()
        }
        setMessages(prev => {
          const newMessages = [...prev, fallbackMessage]
          speakText(fallbackMessage.content, newMessages.length - 1)
          return newMessages
        })
        setError(apiError.message || 'Failed to get response from AI')
      }
    } catch (error: any) {
      console.error('Error in handleSendMessage:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current || !mounted) {
      setError('Speech recognition is not supported in your browser.')
      return
    }

    try {
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
    setIsListening(!isListening)
    } catch (error) {
      console.error('Error toggling speech recognition:', error)
      setError('There was an error with the speech recognition. Please try again.')
      setIsListening(false)
    }
  }

  const performEndSession = () => {
    setMessages([{
      role: 'assistant',
      content: "Session ended. Welcome back whenever you need support.",
      timestamp: new Date().toISOString()
    }]);
    
    // Reset quick responses when ending a session
    setAvailableQuickResponses(quickResponses);
    
    setShowEndSessionConfirm(false);
  };

  // Add navigation to dashboard
  const navigateToDashboard = () => {
    window.location.href = '/dashboard'
  }

  // Handle disclaimer acceptance
  const handleAcceptDisclaimer = () => {
    localStorage.setItem('aiDisclaimerAccepted', 'true');
    setShowDisclaimerModal(false);
  };

  const openResourceUrl = (url: string | null) => {
    if (!url) return;
    
    // Try multiple methods to open the URL
    try {
      // Method 1: window.open with _blank
      const newWindow = window.open(url, '_blank');
      
      // If the window didn't open, try alternative methods
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Method 2: location.href
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
      
      // Method 3: Create and click a temporary link
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }
  };

  // Add function to speak a specific message
  const speakMessage = (message: Message, index: number) => {
    if (message.role === 'assistant') {
      speakText(message.content, index);
    }
  };

  // Function to toggle anonymous mode
  const toggleAnonymousMode = () => {
    if (!isAnonymous && messages.length > 1) {
      // If turning on anonymous mode with existing messages, confirm
      if (window.confirm("Enabling anonymous mode will clear your current chat history. Continue?")) {
        setMessages([{
          role: 'assistant',
          content: "Hello! I'm your Happistaa companion. I'm here to listen and support you. How are you feeling today?",
          timestamp: new Date().toISOString()
        }]);
        setIsAnonymous(true);
      }
    } else {
      setIsAnonymous(!isAnonymous);
    }
  };

  // Function to show signup prompt
  const handleShowSignupPrompt = () => {
    setShowSignupPrompt(true);
  };

  // Function to navigate to signup
  const navigateToSignup = () => {
    window.location.href = '/auth/signup?redirect=ai-companion';
  };

  // Don't render anything until mounted
  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900 mr-4">
              AI Companion
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowCrisisResources(true)}
              variant="outline"
              className="bg-white hover:bg-red-50 border-red-200 text-sm"
              size="sm"
            >
              <span className="material-icons mr-1 text-red-500 text-sm">emergency</span>
              Help
            </Button>
            <Button
              onClick={navigateToDashboard}
              variant="outline"
              className="flex items-center"
              size="icon"
            >
              <span className="material-icons">home</span>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Anonymous chat toggle strip */}
      <div className="bg-[#F6D2C6] bg-opacity-20 py-2 px-4 border-b border-[#F6D2C6] border-opacity-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isAnonymous}
                  // onChange={toggleAnonymousMode}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#F6D2C6] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F6D2C6]"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">Anonymous Chat</span>
              </label>
            </div>
           
          </div>
          
          {/* {isAnonymous && (
            <Button
              onClick={handleShowSignupPrompt}
              variant="outline"
              className="text-sm bg-white border-[#F6D2C6] text-gray-700 hover:bg-[#F6D2C6] hover:bg-opacity-20"
              size="sm"
            >
              <span className="material-icons mr-1 text-sm">save</span>
              Save History
            </Button>
          )} 

          {!isAuthenticated && (
            <Button
              onClick={navigateToSignup}
              variant="outline"
              className="text-sm bg-white border-[#F6D2C6] text-gray-700 hover:bg-[#F6D2C6] hover:bg-opacity-20"
              size="sm"
            >
              <span className="material-icons mr-1 text-sm">save</span>
              Sign Up
            </Button>
          )} */}



        </div>
      </div>
      <div className="bg-[#F6D2C6] bg-opacity-5 py-2 px-4 border-b border-[#F6D2C6] border-opacity-20">
          <div className="flex items-center justify-center">

      <div className="text-xs text-gray-600">
              {/* {isAnonymous 
               // ? "Your conversation won't be saved after closing this window." 
                // : "Your conversation will be saved to your account."} */}
                "Your conversation won't be saved after closing this window." 
            </div>
            </div>
            </div>
      {/* Main chat area with full screen styling */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 relative ${
                  message.role === 'user'
                    ? 'bg-[#F6D2C6] text-gray-800 shadow'
                    : 'bg-[#C4D9F8] text-gray-800 shadow'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
                  
                  {/* Voice controls for assistant messages */}
                  {message.role === 'assistant' && (
                    <div className="flex items-center space-x-2">
                      {/* Speed control */}
                      <div 
                        className="cursor-pointer text-xs font-medium rounded-full px-2 py-1 bg-white hover:bg-blue-50 text-blue-700"
                        onClick={() => {
                          const speeds = [1.0, 1.25, 1.5, 2.0, 0.5, 0.75];
                          const currentIndex = speeds.indexOf(voiceSpeed);
                          const nextIndex = (currentIndex + 1) % speeds.length;
                          changeVoiceSpeed(speeds[nextIndex]);
                        }}
                      >
                        {voiceSpeed}x
                      </div>
                      
                      {/* Play/Pause/Stop buttons */}
                      {currentSpeakingMessageIndex === index ? (
                        <>
                          {isPaused ? (
                            <button 
                              onClick={pauseResumeVoice}
                              className="text-blue-600 hover:text-blue-800"
                              title="Resume"
                            >
                              <span className="material-icons text-sm">play_arrow</span>
                            </button>
                          ) : (
                            <button 
                              onClick={pauseResumeVoice}
                              className="text-blue-600 hover:text-blue-800"
                              title="Pause"
                            >
                              <span className="material-icons text-sm">pause</span>
                            </button>
                          )}
                          <button 
                            onClick={stopSpeaking}
                            className="text-red-500 hover:text-red-700"
                            title="Stop"
                          >
                            <span className="material-icons text-sm">stop</span>
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={() => speakMessage(message, index)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Play"
                        >
                          <span className="material-icons text-sm">volume_up</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="fixed bottom-24 left-0 right-0 mx-auto max-w-md bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
          <div className="flex items-start">
            <span className="material-icons mr-2 text-red-500">error_outline</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Input area with fixed positioning at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {/* Quick responses */}
          {availableQuickResponses.length > 0 && (
            <div className="mb-3 overflow-x-auto pb-2">
              <div className="flex space-x-2">
                {availableQuickResponses.map((response, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(response)}
                    className="bg-[#F6D2C6] bg-opacity-25 hover:bg-opacity-50 whitespace-nowrap px-4 py-2 rounded-full text-sm text-gray-700"
                  >
                    {response}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isListening
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="material-icons">{isListening ? 'mic' : 'mic_none'}</span>
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleSendMessage(inputText)
                }
              }}
              placeholder="Type your message..."
              className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => handleSendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isLoading || !inputText.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-[#F6D2C6] text-gray-800 hover:bg-[#f0c0b0]'
              }`}
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-gray-800 border-t-transparent rounded-full"></div>
              ) : (
                <span className="material-icons">send</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Signup Prompt Modal */}
      {showSignupPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Save Your Conversation</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                Sign up to save your conversation history and access it anytime.
              </p>
              <p>
                Creating an account also gives you access to all other features including Peer Support, Professional Therapy, and Mindfulness Tools.
              </p>
            </div>
            <div className="flex space-x-3 mt-6">
              <Button
                onClick={() => setShowSignupPrompt(false)}
                variant="outline"
                className="flex-1 border-gray-300"
              >
                Continue Anonymously
              </Button>
              <Button
                onClick={navigateToSignup}
                className="flex-1 bg-[#F6D2C6] hover:bg-[#f0c0b0] text-gray-800"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Crisis Resources Modal */}
      {showCrisisResources && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto relative"> {/* Added max-h and overflow-y */}
      <div className="flex justify-between items-center sticky top-0 bg-white pb-4 z-10"> {/* Added sticky for header */}
        <h3 className="text-xl font-bold text-blue-600">Crisis Resources</h3>
        <button
          onClick={() => setShowCrisisResources(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <span className="material-icons">close</span>
        </button>
      </div>

      <p className="text-gray-700">
        If you're experiencing a crisis, please reach out to one of these resources immediately:
      </p>

      <div className="space-y-4">
        {crisisResources.map((resource, index) => (
          <div key={index} className="border border-blue-100 rounded-lg p-4 bg-blue-50">
            <h4 className="font-semibold text-blue-700">{resource.name}</h4>
            <p className="text-gray-600 mb-2">{resource.description}</p>

            {resource.number && (
              <div className="flex items-center mt-2">
                <span className="material-icons text-blue-500 mr-2">phone</span>
                <a
                  href={`tel:${resource.number}`}
                  className="text-blue-600 font-medium"
                >
                  {resource.number}
                </a>
              </div>
            )}

            {resource.url && (
              <button
                onClick={() => openResourceUrl(resource.url)}
                className="mt-3 flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors w-full justify-center"
              >
                <span className="material-icons mr-2">open_in_new</span>
                Visit Website
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowCrisisResources(false)}
        className="w-full py-2 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors sticky bottom-0 bg-white pt-4 z-10" // Added sticky for close button
      >
        Close
      </button>
    </div>
  </div>
)}
      {/* End Session Confirmation */}
      {showEndSessionConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">End Session?</h2>
            <p className="text-gray-700 mb-6">
              Are you sure you want to end this session? {/* {isAnonymous ? "All conversation history will be lost." : "Your conversation history will be saved to your account."} */}
            </p>
            <div className="flex justify-end space-x-4">
              <Button
                onClick={() => setShowEndSessionConfirm(false)}
                variant="outline"
                className="border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={performEndSession}
                className="bg-red-500 hover:bg-red-600"
              >
                End Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer Modal */}
      {showDisclaimerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Important Disclaimer</h2>
            <div className="space-y-4 text-gray-700">
              <p>
                The AI companion is designed to provide general support and companionship, not professional medical or mental health advice.
              </p>
              <p>
                For medical emergencies or mental health crises, please contact emergency services or a licensed healthcare provider immediately.
              </p>
              <p>
                Your conversations are not stored or reviewed by human staff. However, the AI may use the conversation context to provide better responses.
              </p>
              <p className="font-medium">
                By default, you're using anonymous mode. Your chat history will not be saved after you leave this page unless you create an account.
              </p>
            </div>
            <Button
              onClick={handleAcceptDisclaimer}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 rounded-full"
            >
              I Understand
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 