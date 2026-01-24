# Stashify Design Guidelines

## Brand Identity

**Purpose**: Stashify is a cognitive companion for seniors (60+) that preserves memory and prevents social isolation through gentle games, voice interaction, and personal storytelling.

**Aesthetic Direction**: **Warm & Nurturing Heritage**
- Inspired by traditional Tamil/Indian family albums and storytelling traditions
- Soft, earthy palette that feels safe and familiar (not clinical or "tech")
- Generous whitespace with rounded, gentle shapes
- High contrast for visibility without harshness
- Every interaction feels like talking to a caring family member

**Memorable Element**: The AI companions (Thunaivan/Thunaivi) are represented by warm, illustrated avatars with subtle animations that "listen" and "speak" - creating emotional presence without being cartoonish.

---

## Navigation Architecture

**Root Navigation**: Tab Bar (5 tabs)
- Home (daily interaction, reminders)
- Games (grid layout of game cards)
- Moments (Golden Moments journal)
- Family (Family Tree)
- Profile (settings, reports, accessibility)

**Modal Screens**:
- Onboarding flow (stack)
- Game sessions (full-screen)
- Voice companion chat (overlay)
- Report viewer (PDF modal)

---

## Screen-by-Screen Specifications

### Onboarding (Stack - one question per screen)
**Layout**: Centered content, 40% vertical offset, next button at bottom
- **Components**: Large question text (32sp), voice icon button (80×80), input card (single choice tiles 100dp tall), progress dots
- **Safe Areas**: top: insets.top + 24, bottom: insets.bottom + 32

### Home Tab
**Layout**: Scrollable, transparent header with greeting
- **Header**: Transparent, no buttons
- **Content**: Daily greeting card (avatar + message), reminder list, quick game suggestions
- **Components**: Avatar (120×120 circular), reminder cards with large icons (48×48)
- **Safe Areas**: top: 24, bottom: tabBarHeight + 24

### Games Tab
**Layout**: Scrollable grid (2 columns)
- **Header**: Standard, title "Games", no buttons
- **Content**: Game cards (rounded 16dp, 160dp tall) with icon, title, difficulty indicator
- **Safe Areas**: top: 24, bottom: tabBarHeight + 24

### Golden Moments Tab
**Layout**: Scrollable list
- **Header**: Standard with "+" button (right)
- **Content**: Memory cards with thumbnail, title, date, play button
- **Empty State**: Illustration + "Create your first memory"
- **Safe Areas**: top: 24, bottom: tabBarHeight + 24

### Family Tree Tab
**Layout**: Custom scrollable canvas (zoomable)
- **Header**: Standard with "Add Member" (right)
- **Content**: Tree visualization with circular photo nodes, connecting lines
- **Safe Areas**: top: 24, bottom: tabBarHeight + 24

### Profile Tab
**Layout**: Scrollable list
- **Header**: Standard, no buttons
- **Content**: Avatar (editable), name, settings list (font size slider, language, reports)
- **Safe Areas**: top: 24, bottom: tabBarHeight + 24

### Voice Companion Overlay
**Layout**: Bottom sheet (70% height), rounded top corners
- **Content**: Avatar (center, animated), transcript bubbles, microphone button (96×96, bottom-center with shadow)
- **Safe Areas**: bottom: insets.bottom + 24

### Game Sessions (Full Screen)
**Layout**: Header with timer/score, game area, voice instruction button (floating, top-right)
- **Components**: Exit button (top-left), large game elements (grid cells 80×80 minimum)
- **Safe Areas**: top: insets.top + 16, bottom: insets.bottom + 24

---

## Color Palette

**Primary**: `#D97757` (Warm terracotta - reminiscent of Tamil Nadu clay, inviting)
**Primary Dark**: `#B85A3A`
**Background**: `#FFF9F5` (Cream - soft, not stark white)
**Surface**: `#FFFFFF`
**Surface Variant**: `#F5EDE7` (Light beige)
**Text Primary**: `#2D1B12` (Deep brown - high contrast)
**Text Secondary**: `#6B4E3D`
**Success**: `#5A8F6B` (Muted green)
**Warning**: `#E8A84F` (Gentle amber)
**Error**: `#C44A3A` (Muted red, never alarming)
**Accent**: `#7B94C4` (Soft blue for secondary actions)

---

## Typography

**Display Font**: System (Tamil: Noto Sans Tamil, English: SF Pro/Roboto) - avoid decorative fonts for legibility
**Type Scale**:
- Mega (48sp, Bold) - onboarding questions
- XXL (32sp, Bold) - screen titles
- XL (24sp, Semibold) - card headers
- L (20sp, Regular) - body text (default)
- M (18sp, Regular) - secondary text
- S (16sp, Regular) - captions

**Line Height**: 1.5× minimum for readability
**Letter Spacing**: +0.5sp for Tamil script clarity

---

## Visual Design

**Touchables**:
- All buttons 64dp minimum height
- Corner radius: 16dp (cards), 32dp (buttons)
- Active state: scale(0.97) + opacity 0.8
- No blur shadows except floating action buttons

**Floating Buttons** (e.g., voice mic):
- shadowOffset: {width: 0, height: 2}
- shadowOpacity: 0.10
- shadowRadius: 2

**Icons**: Feather icons 32×32 default, 48×48 for primary actions
**Spacing**: 8, 16, 24, 32, 48 (multiples of 8)

---

## Assets to Generate

**icon.png** - App icon with warm gradient and microphone symbol
- WHERE USED: Device home screen

**splash-icon.png** - Thunaivan/Thunaivi avatar illustration (gender-neutral initially)
- WHERE USED: App launch screen

**thunaivan-avatar.png** - Male companion avatar (warm, grandfatherly, Tamil attire)
- WHERE USED: Home screen, voice companion overlay, daily interactions

**thunaivi-avatar.png** - Female companion avatar (warm, grandmotherly, Tamil attire)
- WHERE USED: Home screen, voice companion overlay, daily interactions

**empty-moments.png** - Illustration of photo album with gentle glow
- WHERE USED: Golden Moments tab when no memories exist

**empty-family.png** - Illustration of family silhouettes in circular frame
- WHERE USED: Family Tree tab when empty

**empty-reminders.png** - Illustration of calendar with soft checkmarks
- WHERE USED: Home screen when no reminders set

**game-grid-icon.png** - Memory grid game icon (colorful grid pattern)
- WHERE USED: Games tab card

**game-wordchain-icon.png** - Word chain game icon (connected letters)
- WHERE USED: Games tab card

**game-echo-icon.png** - Echo chronicles game icon (sound waves)
- WHERE USED: Games tab card

**game-riddle-icon.png** - Riddle game icon (lightbulb with puzzle piece)
- WHERE USED: Games tab card

**leaderboard-trophy.png** - Trophy illustration with warm glow
- WHERE USED: Leaderboard screens, achievement notifications