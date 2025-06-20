import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PeerMatch } from '@/types/peer-support';

interface ConnectionModalProps {
  peer: PeerMatch;
  onClose: () => void;
  onSubmit: (message: string, isAnonymous: boolean) => void;
  isSubmitting: boolean;
  sharedJourneys: string[];
}

export function ConnectionModal({
  peer,
  onClose,
  onSubmit,
  isSubmitting,
  sharedJourneys,
}: ConnectionModalProps) {
  const [message, setMessage] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);

  // Default placeholder message based on peer support type
  const getPlaceholderMessage = () => {
    if (peer.supportType === 'support-giver') {
      return `Hi ${peer.name}, I saw you have experience with ${peer.supportPreferences[0] || 'this journey'}. I'm in a similar situation and would love to hear about your experience and ask a few questions. Thanks!`;
    } else {
      return `Hi ${peer.name}, I noticed we share similar experiences with ${peer.supportPreferences[0] || 'this journey'}. I'd be happy to connect and share what worked for me if that would be helpful.`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(message.trim() || getPlaceholderMessage(), isAnonymous);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Send a connection request to {peer.name}
          </h2>
          
          {sharedJourneys.length > 0 && (
            <p className="text-sm text-gray-600 mb-4">
              You are connecting with {peer.name} about: {sharedJourneys.join(', ')}
            </p>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Add a personal message (recommended)
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={getPlaceholderMessage()}
                rows={4}
                maxLength={500}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {500 - message.length} characters remaining
              </p>
            </div>
            
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="anonymous"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <label htmlFor="anonymous" className="block text-sm font-medium text-gray-700">
                  Connect Anonymously
                </label>
                <p className="text-xs text-gray-500">
                  Your name and profile picture will be hidden until you choose to reveal them in the chat.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button 
                type="button" 
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 