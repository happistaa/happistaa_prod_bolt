import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { NextResponse } from 'next/server'

// Initialize Gemini API with a mock key if none is provided
const API_KEY = process.env.GOOGLE_AI_API_KEY || 'mock-key-for-development'
const genAI = new GoogleGenerativeAI(API_KEY)

// Crisis keywords that require immediate attention
const crisisKeywords = [
  'suicide', 'kill myself', 'end it all', 'no reason to live',
  'hurt myself', 'self-harm', 'abuse', 'emergency'
]

// Therapy context for the AI
const therapyContext = `You are an empathetic and professional AI therapist. Your responses should be:
- Compassionate and understanding
- Non-judgmental
- Focused on active listening
- Encouraging but not prescriptive
- Professional while maintaining warmth

Guidelines:
1. Always maintain appropriate therapeutic boundaries
2. Suggest professional help when needed
3. Focus on emotional support and understanding
4. Use natural, conversational language
5. Acknowledge and validate feelings
6. Avoid giving direct advice unless specifically asked
7. Keep responses concise but meaningful
8. Be patient and understanding

Safety Protocol:
1. If the user expresses thoughts of self-harm or suicide, immediately provide crisis resources
2. If the user mentions abuse or dangerous situations, encourage seeking professional help
3. Maintain appropriate boundaries and avoid enabling harmful behaviors
4. Always prioritize user safety and well-being

Remember: This is for supportive conversations only and should not replace professional mental health services.`

// Crisis response template
const crisisResponse = `I'm concerned about what you're sharing. Your safety is important, and I want to make sure you have access to professional help:

1. National Crisis Hotline (24/7): 988
2. Crisis Text Line: Text HOME to 741741
3. Emergency Services: 911

These services are free, confidential, and available 24/7. Would you like me to help you find local mental health resources?`

// Fallback response for when the API is not configured
const fallbackResponse = `I'm here to support you, but my AI service is currently undergoing maintenance. 

In the meantime, I can still listen and provide a space for you to share your thoughts. Please know that help is always available through resources like the National Crisis Hotline (988) or Crisis Text Line (Text HOME to 741741).

Our team is working to restore full functionality as soon as possible.`

export async function POST(req: Request) {
  try {
    // Parse request body
    const { messages } = await req.json()
    console.log('Received messages:', messages)

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages format:', messages)
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      )
    }

      // Get the latest message
      const latestMessage = messages[messages.length - 1].content.toLowerCase()

      // Check for crisis keywords
      const isCrisis = crisisKeywords.some(keyword => latestMessage.includes(keyword))
      if (isCrisis) {
        console.log('Crisis detected in message')
        return NextResponse.json({ 
          response: crisisResponse,
          isCrisis: true
        })
      }

    // Check if API key is properly configured
    if (!process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY === 'your_api_key_here') {
      console.warn('GOOGLE_AI_API_KEY is not configured. Using fallback response.')
      return NextResponse.json({ 
        response: fallbackResponse,
        isCrisis: false
      })
    }

    try {
      // Get the model
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }
        ]
      })

      console.log('Sending message to model:', latestMessage)

      // Prepare the prompt with context
      const prompt = `${therapyContext}\n\nUser: ${latestMessage}\nTherapist:`

      // Generate response
      const result = await model.generateContent(prompt)

      if (!result.response) {
        throw new Error('No response from model')
      }

      const response = result.response.text()
      console.log('Received response from model:', response)

      return NextResponse.json({ 
        response,
        isCrisis: false
      })
    } catch (error: any) {
      console.error('Detailed error in chat generation:', error)
      
      // Handle specific Gemini API errors
      if (error.message?.includes('API key')) {
        return NextResponse.json({ 
          response: "I'm having trouble accessing my AI services. It appears there might be an issue with my configuration. I'll still try to assist you as best I can.",
          isCrisis: false
        })
      }
      
      if (error.message?.includes('quota')) {
        return NextResponse.json({ 
          response: "I've reached my usage limit for the moment. Please try again in a few minutes and I'll be ready to assist you then.",
          isCrisis: false
        })
      }

      if (error.message?.includes('model')) {
        return NextResponse.json({ 
          response: "I'm experiencing some technical difficulties with my AI system. Our team is working on resolving this issue. Thank you for your patience.",
          isCrisis: false
        })
      }

      // Generic error response
      return NextResponse.json({ 
        response: "I apologize, but I'm having trouble processing your message right now. This could be due to high demand or a temporary service disruption. Please try again shortly.",
        isCrisis: false
      })
    }
  } catch (error: any) {
    console.error('Error in chat API:', error)
    return NextResponse.json({ 
      response: "I'm sorry, but I experienced an unexpected error. Please try sending your message again or refresh the page if the issue persists.",
      isCrisis: false
    })
  }
} 