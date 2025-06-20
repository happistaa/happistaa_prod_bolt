import React from 'react';
import { Button } from '@/components/ui/button';
import { SupportRequest } from '@/types/peer-support';

interface SupportRequestsProps {
  supportRequests: SupportRequest[];
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onClose: () => void;
  activeView: 'need' | 'give' | 'all';
  showHeader?: boolean;
}

export function SupportRequests({ 
  supportRequests, 
  onAccept, 
  onDecline, 
  onClose,
  activeView,
  showHeader = false
}: SupportRequestsProps) {
  const pendingRequests = supportRequests.filter(req => req.status === 'pending');
  
  return (
    <div className="space-y-4">
      {showHeader && (
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Support Requests
            {pendingRequests.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                {pendingRequests.length} new
            </span>
          )}
        </h2>
        <Button
          onClick={onClose}
          variant="outline"
          size="sm"
        >
          Close
        </Button>
      </div>
      )}
      
      {supportRequests.length > 0 ? (
        <div className="space-y-4">
          {supportRequests.map(request => {
            const isAnonymous = request.is_anonymous;
            const hasJourneys = request.sender?.support_preferences && request.sender.support_preferences.length > 0;
            
            return (
            <div 
              key={request.id}
              className="border border-gray-100 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                    <div className="text-2xl mr-3">
                      {isAnonymous ? '😊' : request.sender?.avatar_url || '😊'}
                    </div>
                  <div>
                    <h3 className="font-medium">
                        {isAnonymous ? 'Anonymous User' : request.sender?.name || 'User'}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {request.status === 'pending' && (
                  <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    Pending
                  </div>
                )}
              </div>
              
                {hasJourneys && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    <span className="text-xs text-gray-500">Journeys:</span>
                    {request.sender?.support_preferences.map((pref, idx) => (
                      <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {pref}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-gray-700">{request.message}</p>
              </div>
              
              {request.status === 'pending' && (
                <div className="mt-4 flex space-x-2">
                  <Button
                    onClick={() => onAccept(request.id)}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    size="sm"
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => onDecline(request.id)}
                    variant="outline"
                    size="sm"
                  >
                    Decline
                  </Button>
                </div>
              )}
                
                {request.status === 'accepted' && (
                  <div className="mt-4">
                    <span className="text-green-600 text-sm flex items-center">
                      <span className="material-icons text-sm mr-1">check_circle</span>
                      Accepted
                    </span>
                  </div>
                )}
                
                {request.status === 'rejected' && (
                  <div className="mt-4">
                    <span className="text-gray-500 text-sm flex items-center">
                      <span className="material-icons text-sm mr-1">cancel</span>
                      Declined
                    </span>
                  </div>
                )}
            </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No support requests at this time</p>
        </div>
      )}
    </div>
  );
}
