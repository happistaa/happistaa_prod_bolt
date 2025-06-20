'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface Affirmation {
  id: string;
  text: string;
  category: string;
  favorite?: boolean;
}

interface EnhancedAffirmationsProps {
  onClose: () => void;
  onComplete?: () => void;
}

export default function EnhancedAffirmations({ onClose, onComplete }: EnhancedAffirmationsProps) {
  // Sample affirmations data - in a real app, this would come from an API or database
  const [affirmations, setAffirmations] = useState<Affirmation[]>([
    { id: '1', text: 'I am capable of handling whatever comes my way', category: 'Confidence' },
    { id: '2', text: 'I choose to be calm and peaceful', category: 'Peace' },
    { id: '3', text: 'I am worthy of love and respect', category: 'Self-Love' },
    { id: '4', text: 'I trust in my journey and my growth', category: 'Growth' },
    { id: '5', text: 'My potential is limitless, and I can achieve my dreams', category: 'Confidence' },
    { id: '6', text: 'I am grateful for everything I have in my life', category: 'Gratitude' },
    { id: '7', text: 'I am in charge of how I feel, and today I choose happiness', category: 'Happiness' },
    { id: '8', text: 'I have the power to create positive change', category: 'Growth' },
    { id: '9', text: 'I am becoming better every day', category: 'Growth' },
    { id: '10', text: 'My body is healthy; my mind is brilliant; my soul is tranquil', category: 'Health' }
  ]);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filteredAffirmations, setFilteredAffirmations] = useState<Affirmation[]>(affirmations);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get unique categories from affirmations
  const categories = ['All', ...Array.from(new Set(affirmations.map(a => a.category)))];
  
  // Filter affirmations when category or favorites filter changes
  useEffect(() => {
    let filtered = affirmations;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }
    
    if (showFavorites) {
      filtered = filtered.filter(a => a.favorite);
    }
    
    setFilteredAffirmations(filtered.length > 0 ? filtered : affirmations);
    setCurrentIndex(0); // Reset to first affirmation when filters change
  }, [selectedCategory, showFavorites, affirmations]);
  
  const handleNext = () => {
    if (isAnimating) return;
    setDirection(1);
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % filteredAffirmations.length);
    if (onComplete) onComplete();
  };
  
  const handlePrev = () => {
    if (isAnimating) return;
    setDirection(-1);
    setIsAnimating(true);
    setCurrentIndex((prev) => 
      prev === 0 ? filteredAffirmations.length - 1 : prev - 1
    );
  };
  
  const handleToggleFavorite = (id: string) => {
    setAffirmations(prev => 
      prev.map(a => 
        a.id === id ? { ...a, favorite: !a.favorite } : a
      )
    );
  };
  
  const currentAffirmation = filteredAffirmations[currentIndex];
  
  // Animation variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut"
      }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.4,
        ease: "easeIn"
      }
    })
  };
  
  // Get background color based on category
  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      'Confidence': 'bg-blue-50 text-blue-800',
      'Peace': 'bg-green-50 text-green-800',
      'Self-Love': 'bg-pink-50 text-pink-800',
      'Growth': 'bg-purple-50 text-purple-800',
      'Gratitude': 'bg-yellow-50 text-yellow-800',
      'Happiness': 'bg-orange-50 text-orange-800',
      'Health': 'bg-teal-50 text-teal-800'
    };
    
    return colorMap[category] || 'bg-gray-50 text-gray-800';
  };
  
  return (
    <div className="bg-white rounded-xl p-6 max-w-md w-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold">Daily Affirmations</h2>
          <p className="text-sm text-gray-500">Positive statements to boost your mindset</p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      {/* Category filter */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setShowFavorites(!showFavorites)}
          className={`flex items-center text-sm ${
            showFavorites ? 'text-yellow-500' : 'text-gray-500'
          }`}
        >
          <svg 
            className={`w-4 h-4 mr-1 ${showFavorites ? 'fill-yellow-500' : 'fill-none stroke-current'}`} 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          {showFavorites ? 'Show All' : 'Show Favorites'}
        </button>
      </div>
      
      {/* Affirmation card */}
      <div className="relative h-64 mb-6 overflow-hidden">
        <AnimatePresence initial={false} custom={direction} onExitComplete={() => setIsAnimating(false)}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className={`absolute inset-0 flex flex-col items-center justify-center p-6 rounded-lg ${getCategoryColor(currentAffirmation?.category)}`}
          >
            <button
              onClick={() => handleToggleFavorite(currentAffirmation.id)}
              className="absolute top-3 right-3"
              aria-label={currentAffirmation.favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <svg 
                className={`w-6 h-6 ${currentAffirmation.favorite ? 'fill-yellow-500' : 'fill-none stroke-current'}`} 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
            
            <span className="text-sm font-medium mb-4 px-3 py-1 rounded-full bg-white bg-opacity-30">
              {currentAffirmation?.category}
            </span>
            
            <p className="text-2xl font-medium text-center">
              {currentAffirmation?.text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={handlePrev}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          disabled={isAnimating}
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <div className="flex space-x-1">
          {filteredAffirmations.map((_, index) => (
            <div 
              key={index} 
              className={`w-2 h-2 rounded-full ${
                index === currentIndex ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={handleNext}
          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          disabled={isAnimating}
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleNext}
          className="bg-blue-500 hover:bg-blue-600 px-8"
          disabled={isAnimating}
        >
          Next Affirmation
        </Button>
      </div>
    </div>
  );
}
