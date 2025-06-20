'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface Resource {
  id: string;
  title: string;
  description: string;
  url: string;
  icon?: string;
  category?: string;
  embedable?: boolean; // Whether the resource can be embedded in an iframe
}

interface ResourceLinksProps {
  resources: Resource[];
  title?: string;
  description?: string;
  columns?: 1 | 2 | 3;
  openInApp?: boolean; // Whether to open resources in the app or in a new tab
}

const ResourceLinks: React.FC<ResourceLinksProps> = ({
  resources,
  title = 'Resources',
  description,
  columns = 2,
  openInApp = false,
}) => {
  const [activeResource, setActiveResource] = useState<Resource | null>(null);
  const [showEmbedView, setShowEmbedView] = useState(false);
  
  const openResourceUrl = (resource: Resource) => {
    if (!resource.url) return;
    
    // If we want to embed resources and the resource is embedable
    if (openInApp && resource.embedable) {
      setActiveResource(resource);
      setShowEmbedView(true);
      return;
    }
    
    try {
      // Method 1: window.open with _blank
      const newWindow = window.open(resource.url, '_blank');
      
      // If the window didn't open, try alternative methods
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Method 2: location.href
        window.location.href = resource.url;
      }
    } catch (error) {
      console.error('Failed to open URL:', error);
      
      // Method 3: Create and click a temporary link
      const link = document.createElement('a');
      link.href = resource.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Group resources by category if categories exist
  const resourcesByCategory = resources.reduce((acc, resource) => {
    const category = resource.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(resource);
    return acc;
  }, {} as Record<string, Resource[]>);

  const categories = Object.keys(resourcesByCategory);
  const hasCategories = categories.length > 1;

  return (
    <>
      {/* Embed view modal */}
      {showEmbedView && activeResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-medium">{activeResource.title}</h3>
              <button 
                onClick={() => setShowEmbedView(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <iframe 
                src={activeResource.url}
                title={activeResource.title}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                loading="lazy"
              />
            </div>
            
            <div className="p-4 border-t flex justify-between items-center">
              <p className="text-sm text-gray-600">{activeResource.description}</p>
              <Button
                onClick={() => window.open(activeResource.url, '_blank')}
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <span className="material-icons mr-1 text-sm">open_in_new</span>
                Open in New Tab
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6">
        {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
        {description && <p className="text-gray-600 mb-6">{description}</p>}

        {hasCategories ? (
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">{category}</h3>
                <div className={`grid grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : ''} gap-4`}>
                  {resourcesByCategory[category].map((resource) => (
                    <ResourceCard 
                      key={resource.id} 
                      resource={resource} 
                      onOpen={() => openResourceUrl(resource)} 
                      openInApp={openInApp}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : ''} gap-4`}>
            {resources.map((resource) => (
              <ResourceCard 
                key={resource.id} 
                resource={resource} 
                onOpen={() => openResourceUrl(resource)} 
                openInApp={openInApp}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

interface ResourceCardProps {
  resource: Resource;
  onOpen: () => void;
  openInApp?: boolean;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onOpen, openInApp }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:border-orange-200 transition-all">
      <div className="flex items-start">
        {resource.icon && (
          <div className="mr-3 text-orange-500">
            <span className="material-icons">{resource.icon}</span>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{resource.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button 
          onClick={onOpen}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm flex items-center"
          size="sm"
        >
          <span className="material-icons mr-1 text-sm">
            {openInApp && resource.embedable ? 'visibility' : 'open_in_new'}
          </span>
          {openInApp && resource.embedable ? 'View' : 'Open'}
        </Button>
      </div>
    </div>
  );
};

export default ResourceLinks;