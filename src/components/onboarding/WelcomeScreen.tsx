'use client';

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface WelcomeScreenProps {
  onNext?: () => void;
}

export default function WelcomeScreen({ onNext }: WelcomeScreenProps) {
  const router = useRouter()

  const handleGetStarted = () => {
    if (onNext) {
      onNext();
    } else {
      router.push('/onboarding/support-preferences');
    }
  };

  const keyFeatures = [
    { icon: '👥', title: 'Find a Friend', description: 'Match with someone who understands your journey.' },
    { icon: '💬', title: 'Talk & Share', description: 'Chat, call, or discuss with peers who\'ve been there.' },
    { icon: '🎓', title: 'Verified Support', description: 'Connect with people who are certified to guide you.' },
    { icon: '🌱', title: 'Grow Together', description: 'Learn coping strategies and support others.' },
  ]

  const testimonials = [
    { name: "Sarah K.", text: "Happistaa connected me with someone who truly understood my anxiety." },
    { name: "Michael T.", text: "The peer support here is genuine. I finally found people who get what I'm going through." },
    { name: "Priya R.", text: "Having a supportive community during tough times made all the difference." },
  ]

  const dataPoints = [
    { number: "10K+", label: "Happy Users" },
    { number: "98%", label: "Satisfaction Rate" },
    { number: "24/7", label: "Support Available" },
  ]

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen flex flex-col items-center justify-center p-4 gradient-bg"
    >
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-center mb-6"
        >
          <div className="text-3xl font-bold text-blue-600 flex items-center">
            <span className="text-4xl mr-2">🤝</span> Happistaa
          </div>
        </motion.div>

        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {/* Welcome to Happistaa – */}
            A Friend in Need!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
          Find the support you need, instantly. Connect with peers who&apos;ve been through similar experiences.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
          className="space-y-6"
        >
          {/* 2x2 Grid for USPs */}
          <div className="grid grid-cols-2 gap-4">
            {keyFeatures.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + (index * 0.1), duration: 0.3 }}
                className="bg-white rounded-lg p-4 text-center items-center justify-center shadow-sm"
              >
                <span className="text-2xl mr-3">{feature.icon}</span>
                <div>
                  <h3 className="font-medium text-gray-900">{feature.title}</h3>
                  {/* <p className="text-sm text-gray-600">{feature.description}</p> */}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Testimonials */}
         {/*} <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="py-4"
          >
            <div className="flex overflow-x-auto space-x-4 py-1 no-scrollbar">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={index} 
                  className="bg-white rounded-lg p-3 shadow-sm min-w-[200px] border-l-4 border-blue-400 flex-shrink-0"
                >
                  <p className="text-xs text-gray-600 italic mb-2">"{testimonial.text}"</p>
                  <span className="text-xs font-medium text-blue-700">- {testimonial.name}</span>
                </div>
              ))}
            </div>
          </motion.div> */}

          {/* Data Points */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-between py-4 bg-white rounded-lg shadow-sm p-4 mb-4"
          >
            {dataPoints.map((point, index) => (
              <div key={index} className="text-center">
                <p className="text-lg font-bold text-blue-700">{point.number}</p>
                <p className="text-sm text-blue-600">{point.label}</p>
              </div>
            ))}
          </motion.div>

          <Button
            onClick={handleGetStarted}
            className="w-full py-6 text-lg rounded-full"
          >
            Get Started
          </Button>
          <Button
            onClick={() => router.push('/auth/login')}
            variant="outline"
            className="w-full py-6 text-lg rounded-full"
          >
            I already have an account
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}