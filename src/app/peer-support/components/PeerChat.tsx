import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PeerMatch, ChatMessage } from '@/types/peer-support';
import { usePeerChat } from '@/hooks/peer-support/usePeerChat';

interface PeerChatProps {
  peer: PeerMatch;
  onClose: () => void;
  initialMessages?: ChatMessage[];
  initialIsAnonymous?: boolean;
}

export function PeerChat({ peer, onClose, initialMessages = [], initialIsAnonymous = false }: PeerChatProps) {
  const {
    messages,
    isLoading,
    isAnonymous,
    setIsAnonymous,
    sendMessage: sendMessageToApi,
    deleteChat,
    fetchMessages
  } = usePeerChat();
  
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch messages when component mounts
  useEffect(() => {
    console.log("PeerChat opened with peer:", peer);
    
    if (peer && peer.id) {
      console.log("Fetching messages for peer:", peer.id);
      fetchMessages(peer.id)
        .then(msgs => {
          console.log("Fetched messages:", msgs);
          if (msgs && msgs.length > 0) {
            setChatMessages(msgs);
          }
        })
        .catch(err => {
          console.error("Error fetching messages:", err);
        });
    }
  }, [peer, fetchMessages]);

  // Set initial anonymous mode
  useEffect(() => {
    setIsAnonymous(initialIsAnonymous);
  }, [initialIsAnonymous, setIsAnonymous]);

  // Update messages when they change from the hook
  useEffect(() => {
    if (messages.length > 0) {
      setChatMessages(messages);
    }
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !peer) return;
    
    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: 'you',
      message: chatMessage,
      timestamp: new Date(),
      isAnonymous
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatMessage('');
    
    // Save to localStorage for persistence
    localStorage.setItem('chatMessages', JSON.stringify([...chatMessages, userMessage]));
    
    try {
      // Send to API
      await sendMessageToApi(peer.id, chatMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      // Could add error handling UI here
    }
  };

  const handleDeleteChat = async () => {
    try {
      console.log(`Attempting to delete chat with peer: ${peer.id}`);
      const success = await deleteChat(peer.id);
      
      if (success) {
        console.log('Chat deletion successful');
        setShowDeleteConfirm(false);
        // Clear local chat messages before closing
        setChatMessages([]);
        onClose();
      } else {
        console.error('Failed to delete chat');
        // Show an error message to the user
        setChatMessages(prev => [
          ...prev, 
          {
            id: `error-${Date.now()}`,
            sender: 'system',
            message: 'Failed to delete chat. Please try again.',
            timestamp: new Date(),
            isAnonymous: false
          }
        ]);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error in handleDeleteChat:', error);
      // Show an error message to the user
      setChatMessages(prev => [
        ...prev, 
        {
          id: `error-${Date.now()}`,
          sender: 'system',
          message: 'An error occurred while deleting the chat. Please try again.',
          timestamp: new Date(),
          isAnonymous: false
        }
      ]);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-3rem)]">
        {/* Header section */}
        <div className="mb-4">
          {/* First line: Back button, Name, End Chat button */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <button 
                onClick={onClose}
                className="mr-4 text-gray-600 hover:text-blue-500"
              >
                <span className="material-icons">arrow_back</span>
              </button>
              <div className="flex items-center">
                <div className="relative">
                  <span className="text-2xl mr-2">{peer.avatar}</span>
                  {peer.isActive && (
                    <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full"></span>
                  )}
                </div>
                <h2 className="font-semibold text-gray-900">{peer.name}</h2>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                size="sm"
                className="text-red-500 hover:bg-red-50 border-red-200"
              >
                <span className="material-icons mr-1 text-sm">delete</span>
                Delete Chat
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
              >
                End Chat
              </Button>
            </div>
          </div>
          
          {/* Second line: Ratings and Anonymous toggle */}
          <div className="flex justify-between items-center ml-10 pl-2">
            <span className="text-sm text-gray-600 flex items-center">
              <span className="material-icons text-yellow-500 text-sm mr-1">star</span>
              {peer.rating} ({peer.totalRatings})
            </span>
            
            <div className="flex items-center">
              <label className="text-sm text-gray-600 mr-2">Anonymous:</label>
              <div 
                className={`w-10 h-5 rounded-full flex items-center cursor-pointer transition-colors ${
                  isAnonymous ? 'bg-blue-500' : 'bg-gray-300'
                }`}
                onClick={() => setIsAnonymous(!isAnonymous)}
              >
                <div 
                  className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                    isAnonymous ? 'translate-x-5' : 'translate-x-1'
                  }`} 
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Delete Chat</h3>
              <p className="mb-6">
                Are you sure you want to delete this conversation? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteChat}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Shared journeys info */}
        {peer.supportPreferences.length > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <p className="text-sm text-gray-600 mb-2">Areas of experience:</p>
            <div className="flex flex-wrap gap-2">
              {peer.supportPreferences.map((area: string, i: number) => (
                <span 
                  key={i}
                  className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Chat messages */}
        <div className="flex-1 bg-white rounded-lg shadow-sm p-4 overflow-y-auto mb-4">
          {chatMessages.map((msg, index) => (
            <div 
              key={index} 
              className={`mb-4 ${msg.sender === 'you' ? 'text-right' : ''} ${msg.sender === 'system' ? 'text-center' : ''}`}
            >
              {msg.sender !== 'system' && (
                <div className="text-xs text-gray-500 mb-1">
                  {msg.sender === 'you' ? (msg.isAnonymous ? 'Anonymous' : 'You') : msg.sender}
                  {msg.isAnonymous && msg.sender !== 'you' && " (Anonymous)"}
                </div>
              )}
              <div 
                className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                  msg.sender === 'you' 
                    ? 'bg-blue-500 text-white' 
                    : msg.sender === 'system'
                      ? 'bg-gray-200 text-gray-700 text-sm'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.message}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Message input */}
        <div className="flex items-center bg-white rounded-lg shadow-sm p-2">
          <input
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder={isAnonymous ? "Type anonymously..." : "Type your message..."}
            className="flex-1 p-2 border-none focus:outline-none focus:ring-0"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatMessage.trim() || isLoading}
            className={`p-2 rounded-full ${
              !chatMessage.trim() || isLoading ? 'text-gray-400' : 'text-blue-500 hover:text-blue-600'
            }`}
          >
            <span className="material-icons">{isLoading ? 'hourglass_empty' : 'send'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
