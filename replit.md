# Stashify

## Overview

Stashify is a React Native mobile application designed as a cognitive companion for seniors (60+). The app focuses on dementia prevention and elderly care through multiplayer cognitive games, AI voice companions, memory journaling, and family connection features. The design philosophy centers on warmth, accessibility, and emotional safety with a Tamil/Indian heritage-inspired aesthetic.

**Core Features:**
- AI Voice Companions (Thunaivan/Thunaivi) for emotional interaction
- Cognitive games (Memory Grid, Word Chain, Echo Chronicles, Riddles)
- Golden Moments voice journal for memory preservation
- Family Tree system for maintaining connections
- Reminders for medicine, tasks, and appointments
- Senior-friendly UI with large buttons, high contrast, and voice cues

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework:** React Native with Expo SDK 54
- **Navigation:** React Navigation v7 with native stack and bottom tabs
- **State Management:** React Context for auth/settings, TanStack React Query for server state
- **Styling:** Theme-based system with light/dark mode support via `useTheme` hook
- **Animations:** React Native Reanimated for smooth, spring-based animations
- **Internationalization:** i18next with English and Tamil language support

**Directory Structure:**
- `client/` - All React Native code (screens, components, hooks, navigation)
- `server/` - Express backend with TypeScript
- `shared/` - Shared types and database schema (Drizzle ORM)

### Backend Architecture
- **Runtime:** Express.js with TypeScript, compiled via esbuild
- **Database:** PostgreSQL with Drizzle ORM for schema management
- **API Pattern:** RESTful endpoints prefixed with `/api`
- **Storage:** Currently in-memory storage (`MemStorage` class) with interface ready for database migration

### Data Storage
- **Local:** AsyncStorage for user preferences, settings, and offline data
- **Remote:** PostgreSQL database (Drizzle schema defined in `shared/schema.ts`)
- **Assets:** Local image storage with expo-image-picker for photos

### Authentication
- **Method:** Simple 4-digit PIN-based authentication (senior-friendly)
- **Session:** User data persisted in AsyncStorage
- **Onboarding:** Multi-step flow collecting name, DOB, gender, language, interests

### Key Design Patterns
- **Path Aliases:** `@/` maps to `client/`, `@shared/` maps to `shared/`
- **Theming:** Centralized color tokens in `constants/theme.ts`
- **Components:** Atomic design with ThemedText, ThemedView, Button, Card as primitives
- **Screen Layout:** Consistent safe area handling with header height and tab bar offsets
- **Haptics:** Expo Haptics for tactile feedback on interactions

## External Dependencies

### Third-Party Services
- **Supabase:** Configured for backend services (auth storage adapter ready)
- **Google Generative AI:** `@google/genai` for AI companion responses

### Key Expo Modules
- `expo-speech` - Text-to-speech for voice companion
- `expo-audio` - Audio recording for voice journaling
- `expo-notifications` - Reminder notifications
- `expo-image-picker` - Photo capture for moments/family
- `expo-haptics` - Tactile feedback
- `expo-file-system` - Local file management
- `expo-print` / `expo-sharing` - PDF report generation

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_KEY` - Supabase anon key
- `EXPO_PUBLIC_DOMAIN` - API server domain for mobile client

## Recent Changes (January 2026)

### Translation Key Fixes
- Fixed translation key conflicts where tab labels used keys that overlapped with nested objects
- Tab labels now use dedicated keys: `gamesTab`, `momentsTab`, `familyTab`, `profileTab`
- Game titles and descriptions use nested keys like `games.memoryGrid`, `games.memoryGridDesc`

### Custom UI Components
- Replaced external slider and date picker dependencies with custom implementations for web compatibility
- ProfileScreen uses button-based font size controls instead of native Slider
- OnboardingScreen uses custom scroll-based date picker (Month/Year selection)

### Component Updates
- ErrorFallback component updated with Stashify branding and warm theme colors
- ThemedText simplified to avoid Settings context dependency issues
- All screens use consistent safe area handling with header height offsets