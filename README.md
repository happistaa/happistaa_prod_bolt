# Happistaa - Mental Wellness Platform

Happistaa is a comprehensive mental wellness platform that combines peer support, AI companionship, therapist matching, and mindfulness tools to support your mental health journey.

## Features

- **Instant Peer Support**: Connect with others who share similar experiences
- **Voice-enabled AI Companion**: 24/7 accessible reflection and support through voice interaction
- **Smart Therapist Matching**: Find the perfect therapist based on your unique needs
- **Mindfulness Tools**: Engaging exercises and tools for daily mental wellness practice

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- React
- Modern Web APIs (Web Speech API for voice features)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Contributing

We welcome contributions! Please read our contributing guidelines before submitting pull requests.

## License

MIT License - feel free to use this project for your own purposes. 

## Authentication Flow

### Guest Experience
- Users can access the dashboard without signing up
- Users can view listings on all feature pages:
  - Peer Support: Browse available peer matches
  - Therapy: Browse therapist profiles
  - Mindfulness: Browse mindfulness resources

### Sign-up Triggers
- Sign-up is prompted only when a user tries to:
  - Connect with a peer on the peer support page
  - Book a session on the therapy page
  - Use a mindfulness tool on the mindfulness page
- Users won't be prompted to sign up directly from the dashboard

### Profile Setup
- After signing up, users complete a minimal mandatory profile:
  - Full Name
  - Date of Birth
  - Location
  - Gender
- Optional information for better peer matching can be added later

### Feature Protection
- AI Companion: Available without authentication
- Peer Support: View listing without auth, connect requires auth
- Therapy Booking: View listing without auth, booking requires auth
- Mindfulness Tools: View listing without auth, using tools requires auth

### Profile Completion
- User profiles show completion percentage
- The "Get More Relevant Matches" CTA appears in peer support for users who haven't provided optional information
- Users can add optional profile fields later to improve match quality

## Development Notes
- Authentication state is managed using localStorage
- Feature access is enforced on the feature pages, not the dashboard
- Redirect parameters preserve the user's intended destination after signup 