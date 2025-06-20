import React from 'react';
import { Button } from '@/components/ui/button';
import { SupportRequest } from '@/types/peer-support';

interface SentRequestsProps {
  sentRequests: SupportRequest[];
  onCancel: (requestId: string) => void;
  onClose: () => void;
  showHeader?: boolean;
}

export function SentRequests({ 
  sentRequests, 
  onCancel,
  onClose,
  showHeader = false
}: SentRequestsProps) {
  const pendingRequests = sentRequests.filter(req => req.status === 'pending');
  
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Sent Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                {pendingRequests.length}
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
      
      {sentRequests.length > 0 ? (
        <div className="space-y-4">
          {sentRequests.map(request => {
            const isAnonymous = request.is_anonymous;
            
            return (
              <div 
                key={request.id}
                className="border border-gray-100 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-medium">
                        To: {request.receiver_name || request.receiver?.name || "Peer"}
                      </h3>
                      {isAnonymous && (
                        <span className="ml-2 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                          Anonymous
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Sent: {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  {request.status === 'pending' && (
                    <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                      Awaiting Response
                    </div>
                  )}
                  {request.status === 'accepted' && (
                    <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Accepted
                    </div>
                  )}
                  {request.status === 'rejected' && (
                    <div className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                      Unable to Connect
                    </div>
                  )}
                </div>
                
                <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-gray-700">{request.message}</p>
                </div>
                
                {request.status === 'pending' && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={() => onCancel(request.id)}
                      variant="outline"
                      size="sm"
                      className="text-gray-600"
                    >
                      Cancel Request
                    </Button>
                  </div>
                )}
                
                {request.status === 'accepted' && (
                  <div className="mt-4 flex items-center text-green-600 text-sm">
                    <span className="material-icons text-sm mr-1">check_circle</span>
                    Request accepted! You can now chat.
                  </div>
                )}
                
                {request.status === 'rejected' && (
                  <div className="mt-4">
                    <p className="text-gray-500 text-sm">
                      The peer is unable to connect at this time.
                    </p>
                    <div className="mt-2 text-sm">
                      <span className="text-blue-600">Find similar peers</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">You haven't sent any connection requests yet</p>
        </div>
      )}
    </div>
  );
} 