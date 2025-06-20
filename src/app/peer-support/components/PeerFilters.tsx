import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PeerFilters as PeerFiltersType } from '@/types/peer-support';

interface PeerFiltersProps {
  filters: PeerFiltersType;
  onFiltersChange: (filters: PeerFiltersType) => void;
  journeyOptions: string[];
  selectedJourneys: string[];
  onJourneyToggle: (journey: string) => void;
  onSaveJourneys: () => void;
  activeOnly: boolean | null;
  setActiveOnly: (value: boolean | null) => void;
  sortBy: 'match' | 'rating' | 'peopleSupported' | 'availability';
  setSortBy: (value: 'match' | 'rating' | 'peopleSupported' | 'availability') => void;
  showFilterModal: boolean;
  setShowFilterModal: (value: boolean) => void;
  showSortOptions: boolean;
  setShowSortOptions: (value: boolean) => void;
  userProfile: any;
  count: number;
}

export function PeerFilters({
  filters,
  onFiltersChange,
  journeyOptions,
  selectedJourneys,
  onJourneyToggle,
  onSaveJourneys,
  activeOnly,
  setActiveOnly,
  sortBy,
  setSortBy,
  showFilterModal,
  setShowFilterModal,
  showSortOptions,
  setShowSortOptions,
  userProfile,
  count
}: PeerFiltersProps) {
  const [showJourneySelector, setShowJourneySelector] = useState<boolean>(false);

  // Handle sort change
  const handleSortChange = (sortBy: 'match' | 'rating' | 'peopleSupported' | 'availability') => {
    onFiltersChange({ ...filters, sortBy });
    setShowSortOptions(false);
  };

  // Handle active filter change
  const handleActiveFilterChange = (activeOnly: boolean | null) => {
    onFiltersChange({ ...filters, activeOnly });
  };

  // Reset filters
  const handleResetFilters = () => {
    onFiltersChange({
      activeOnly: null,
      sortBy: 'match'
    });
  };

  return (
    <>
      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">
          Find Friends
          <span className="text-gray-500 font-normal ml-2 text-sm">
            ({count || 0})
          </span>
        </h2>
        
        {/* Filter and Sort controls */}
        <div className="flex md:flex-row justify-between items-start md:items-center gap-4">
          {/* Filter button */}
          <Button
            onClick={() => setShowFilterModal(!showFilterModal)}
            variant="outline"
            className="flex items-center"
            aria-expanded={showFilterModal}
          >
            <span className="material-icons mr-1">filter_list</span>
            Filter
            {activeOnly !== null && (
              <span className="ml-1 h-2 w-2 bg-blue-500 rounded-full"></span>
            )}
          </Button>
          
          {/* Journey selector button */}
          <Button
            onClick={() => setShowJourneySelector(!showJourneySelector)}
            variant="outline"
            className="flex items-center relative"
            aria-expanded={showJourneySelector}
          >
            <span className="material-icons mr-1">tune</span>
            My Journey
            {selectedJourneys.length > 0 && (
              <span className="absolute -top-1 right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
            )}
          </Button>
          
          {/* Sort dropdown */}
          <Button
            onClick={() => setShowSortOptions(!showSortOptions)}
            variant="outline"
            className="flex items-center"
            aria-expanded={showSortOptions}
          >
            <span className="material-icons mr-1">sort</span>
            Sort
          </Button>
        </div>
      </div>

      {/* Journey selector modal */}
      {showJourneySelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Select Areas for Your Journey
              </h3>
              <button
                onClick={() => setShowJourneySelector(false)}
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
                onClick={() => setShowJourneySelector(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onSaveJourneys();
                  setShowJourneySelector(false);
                }}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full h-full md:h-auto md:max-w-3xl md:rounded-xl md:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center z-10">
              <h2 className="text-xl font-semibold">Filter Friends</h2>
              <button 
                onClick={() => setShowFilterModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Active now filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { value: null, label: 'All Users' },
                    { value: true, label: 'Active Now' },
                    { value: false, label: 'Not Active' }
                  ].map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleActiveFilterChange(option.value)}
                      className={`p-2 text-sm rounded-md border ${
                        filters.activeOnly === option.value
                          ? 'bg-blue-50 border-blue-300 text-blue-700' 
                          : 'border-gray-300 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {userProfile && userProfile.supportType === 'support-seeker' && (
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded text-blue-500 mr-2"
                    />
                    <span>Certified mentors only</span>
                  </label>
                </div>
              )}
            </div>
            
            <div className="p-5 border-t flex justify-between">
              <Button 
                onClick={handleResetFilters}
                variant="outline"
              >
                Reset All
              </Button>
              <Button 
                onClick={() => setShowFilterModal(false)}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sort options */}
      {showSortOptions && (
        <div className="mt-4 p-4 border border-gray-100 rounded-lg">
          <h4 className="font-medium mb-3">Sort By</h4>
          
          <div className="space-y-2">
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={sortBy === 'match'}
                  onChange={() => setSortBy('match')}
                  className="text-blue-500 mr-2"
                />
                <span>Best match</span>
              </label>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={sortBy === 'rating'}
                  onChange={() => setSortBy('rating')}
                  className="text-blue-500 mr-2"
                />
                <span>Highest rating</span>
              </label>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={sortBy === 'peopleSupported'}
                  onChange={() => setSortBy('peopleSupported')}
                  className="text-blue-500 mr-2"
                />
                <span>Most people supported</span>
              </label>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  checked={sortBy === 'availability'}
                  onChange={() => setSortBy('availability')}
                  className="text-blue-500 mr-2"
                />
                <span>Availability</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
