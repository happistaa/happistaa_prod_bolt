import React, { useState, useEffect } from 'react';

interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Notification({
  type,
  message,
  duration = 5000,
  onClose
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'success':
        return 'text-green-700';
      case 'error':
        return 'text-red-700';
      case 'info':
        return 'text-blue-700';
      default:
        return 'text-gray-700';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <span className="material-icons text-green-600">check_circle</span>
        );
      case 'error':
        return (
          <span className="material-icons text-red-600">error</span>
        );
      case 'info':
        return (
          <span className="material-icons text-blue-600">info</span>
        );
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-md rounded-lg shadow-md border ${getBackgroundColor()}`}>
      <div className="p-4 flex items-center">
        <div className="mr-3">
          {getIcon()}
        </div>
        <div className={`flex-1 ${getTextColor()}`}>
          {message}
        </div>
        <button 
          onClick={() => {
            setIsVisible(false);
            if (onClose) onClose();
          }}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          <span className="material-icons">close</span>
        </button>
      </div>
    </div>
  );
} 