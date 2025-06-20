import React from 'react';
import { Button } from '@/components/ui/button';

interface JourneySelectorProps {
  journeyOptions: string[];
  selectedJourneys: string[];
  onJourneyToggle: (journey: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export function JourneySelector({
  journeyOptions,
  selectedJourneys,
  onJourneyToggle,
  onSave,
  onClose
}: JourneySelectorProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Select Areas for Your Journey
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <span className="material-icons">close</span>
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {journeyOptions.map(journey => (
            <label
              key={journey}
              className={`px-3 py-2 rounded-full border cursor-pointer ${
                selectedJourneys.includes(journey)
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              <input
                type="checkbox"
                value={journey}
                checked={selectedJourneys.includes(journey)}
                onChange={() => onJourneyToggle(journey)}
                className="sr-only"
              />
              {journey}
            </label>
          ))}
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave();
              onClose();
            }}
            className="bg-blue-500 hover:bg-blue-600"
          >
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
