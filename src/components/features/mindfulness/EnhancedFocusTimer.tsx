'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface EnhancedFocusTimerProps {
  onClose: () => void;
  onComplete?: () => void;
}

export default function EnhancedFocusTimer({ onClose, onComplete }: EnhancedFocusTimerProps) {
  // Timer settings
  const [duration, setDuration] = useState(25 * 60); // Default 25 minutes in seconds
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Animation states
  const [progress, setProgress] = useState(100);
  const [pulseAnimation, setPulseAnimation] = useState(false);
  
  // Refs for tracking time accurately
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  
  // Quick preset durations in minutes
  const presets = [5, 15, 25, 45, 60];
  
  // Set up the timer
  useEffect(() => {
    setTimeLeft(duration);
    setProgress(100);
  }, [duration]);
  
  // Handle timer logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      // Record the start time when timer begins
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now() - pausedTimeRef.current;
      }
      
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      // Set up a new interval that checks actual elapsed time
      intervalRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current!) / 1000);
        const newTimeLeft = Math.max(0, duration - elapsedSeconds);
        
        setTimeLeft(newTimeLeft);
        setProgress((newTimeLeft / duration) * 100);
        
        // Pulse animation when timer is running
        setPulseAnimation(prev => !prev);
        
        // Handle timer completion
        if (newTimeLeft === 0) {
          handleTimerComplete();
        }
      }, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, isPaused, duration]);
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle timer actions
  const handleStart = () => {
    if (isPaused) {
      // If resuming from pause, adjust the start time
      pausedTimeRef.current += Date.now() - (startTimeRef.current || Date.now());
      setIsPaused(false);
    } else {
      // Fresh start
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
      setIsRunning(true);
    }
  };
  
  const handlePause = () => {
    setIsPaused(true);
    setPulseAnimation(false);
  };
  
  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(duration);
    setProgress(100);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    setPulseAnimation(false);
  };
  
  const handleTimerComplete = () => {
    setIsRunning(false);
    setIsPaused(false);
    startTimeRef.current = null;
    pausedTimeRef.current = 0;
    
    // Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
    
    // Notify parent component
    if (onComplete) {
      onComplete();
    }
  };
  
  // Set timer duration from preset
  const handlePresetClick = (minutes: number) => {
    if (!isRunning || window.confirm('Reset the current timer?')) {
      handleReset();
      setDuration(minutes * 60);
    }
  };
  
  // Calculate circle path for progress indicator
  const calculateCirclePath = () => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;
    return offset;
  };
  
  return (
    <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-semibold">Focus Timer</h2>
          <p className="text-sm text-gray-500">Stay focused and productive</p>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      
      <div className="flex flex-col items-center space-y-8 py-4">
        {/* Circular progress indicator */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          {/* Background circle */}
          <svg className="absolute w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="5"
            />
          </svg>
          
          {/* Progress circle */}
          <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={calculateCirclePath()}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          
          {/* Timer display */}
          <div 
            className={`text-5xl font-bold text-gray-800 ${
              isRunning && !isPaused && pulseAnimation ? 'scale-105' : 'scale-100'
            } transition-transform duration-500 ease-in-out`}
          >
            {formatTime(timeLeft)}
          </div>
        </div>
        
        {/* Timer controls */}
        <div className="flex justify-center space-x-4">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              className="bg-blue-500 hover:bg-blue-600 px-8"
            >
              Start
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button
                  onClick={handleStart}
                  className="bg-green-500 hover:bg-green-600 px-8"
                >
                  Resume
                </Button>
              ) : (
                <Button
                  onClick={handlePause}
                  className="bg-yellow-500 hover:bg-yellow-600 px-8"
                >
                  Pause
                </Button>
              )}
            </>
          )}
          
          <Button
            onClick={handleReset}
            variant="outline"
            className="border-gray-300"
          >
            Reset
          </Button>
        </div>
        
        {/* Quick duration presets */}
        <div className="w-full">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Presets</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {presets.map(minutes => (
              <button
                key={minutes}
                onClick={() => handlePresetClick(minutes)}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  duration === minutes * 60
                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>
        
        {/* Tips */}
        <div className="w-full bg-blue-50 p-3 rounded-lg text-sm">
          <p className="font-medium text-blue-700 mb-1">Focus Tips:</p>
          <ul className="list-disc pl-5 text-gray-700 space-y-1">
            <li>Remove distractions from your environment</li>
            <li>Set a clear goal for your focus session</li>
            <li>Take a 5-minute break after each session</li>
            <li>Stay hydrated during your work</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 