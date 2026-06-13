# Design Guidelines: Business Club of Financial University Platform

## Design Approach

**Selected Approach:** Design System (Material Design) with professional customization for educational/business context

**Justification:** This platform serves dual purposes - administrative efficiency and engaging member experience. Material Design provides robust patterns for complex data management while supporting rich media presentation. The system's elevation and card-based layouts work perfectly for event cards, video libraries, and course modules.

**Key Design Principles:**
- Professional credibility reflecting Financial University's academic standing
- Clear role-based visual hierarchy (admin vs member interfaces)
- Content-first approach emphasizing events, videos, and courses
- Efficient navigation between platform sections

---

## Core Design Elements

### A. Color Palette

**Primary Colors:**
- Primary: 220 85% 35% (Deep professional blue - university/business credibility)
- Primary Hover: 220 85% 30%
- Background Dark: 222 47% 11%
- Background Light: 0 0% 98%

**Accent Colors:**
- Accent: 150 70% 45% (Teal green for CTAs and success states)
- Warning: 35 90% 55% (Event urgencies, deadlines)
- Error: 0 75% 55%

**Neutral Palette:**
- Text Dark: 222 47% 95%
- Text Light: 222 20% 20%
- Border Dark: 222 20% 25%
- Border Light: 222 10% 85%
- Card Background Dark: 222 40% 15%
- Card Background Light: 0 0% 100%

### B. Typography

**Font Families:**
- Headers: 'Inter', sans-serif (700, 600, 500 weights)
- Body: 'Inter', sans-serif (400, 500 weights)
- Code/Monospace: 'JetBrains Mono', monospace (for course code snippets if needed)

**Type Scale:**
- Hero/Page Title: text-5xl md:text-6xl font-bold
- Section Headers: text-3xl md:text-4xl font-semibold
- Card Titles: text-xl md:text-2xl font-semibold
- Subsections: text-lg font-medium
- Body: text-base
- Captions: text-sm text-gray-500

### C. Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16, 20, 24**
- Component padding: p-4 to p-8
- Section spacing: py-12 to py-24
- Card spacing: p-6
- Form elements: gap-4 to gap-6

**Grid System:**
- Main container: max-w-7xl mx-auto px-4
- Event cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Video gallery: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8
- Course modules: single column max-w-4xl for readability

### D. Component Library

**Navigation:**
- Persistent sidebar for authenticated users (collapsible on mobile)
- Top bar with user profile, notifications, role indicator (Member/Admin badge)
- Breadcrumb navigation for deep sections (Courses > Module 1 > Lesson 3)

**Event Cards:**
- Elevated cards with shadow-lg hover:shadow-xl transition
- Header image placeholder or university branding pattern
- Badge for event status (Upcoming/Registration Open/Full/Past)
- Clear CTA buttons (Register/View Details/Manage)
- Icon indicators for date, time, location, duration using Heroicons

**Video Library:**
- Thumbnail grid with 16:9 aspect ratio cards
- Play icon overlay on thumbnails
- Video metadata: title, date, views count
- Comment section with threaded replies, timestamps
- Admin upload modal with drag-drop area

**Livestream Section:**
- Prominent embedded RuTube player (16:9 responsive)
- Live status indicator with red dot animation
- Chat/comments sidebar (optional toggle)
- Upcoming livestream schedule below player

**Learning Courses:**
- Course card overview showing progress bars for members
- Module accordion with lesson list
- Video player with controls
- Task cards with assignment description, due date, submission status
- PDF upload zone with drag-drop, file size indicator
- Admin grading interface

**Forms:**
- Floating label inputs (Material Design style)
- Clear validation states with inline error messages
- Primary action buttons at form bottom-right
- Cancel/secondary actions as text buttons

**Tables (Admin Dashboard):**
- Sortable columns with clear headers
- Row actions dropdown menu
- Pagination with page size selector
- Search and filter controls above table

### E. Animations

**Minimal, Purposeful Animations:**
- Card hover lift: transition-all duration-200 hover:scale-[1.02]
- Button interactions: built-in button states (no custom needed)
- Modal enter/exit: fade + scale
- Loading states: simple spinner (Heroicons refresh icon with spin)
- Live indicator: pulse animation on red dot

---

## Section-Specific Guidelines

**Login Screens:**
- Split layout: Left side = university branding/image, Right side = form
- Minimal fields (email/username + password)
- Role toggle (Member/Admin) as subtle tab switch
- "Forgot password" and social login options

**Dashboard (Member):**
- Quick stats cards (Upcoming events, Courses progress, Recent videos)
- "Today's Events" prominent section
- Recent activity feed

**Dashboard (Admin):**
- Analytics overview (Total members, Event registrations, Video views)
- Quick actions (Create Event, Upload Video, Manage Course)
- Pending tasks list (Submissions to grade, Event approvals)

**Event Management:**
- Calendar view with event dots (optional month grid)
- List view as default with filters (Past/Upcoming/My Events)
- Guest registration: simplified form without login requirement, unique link generation

---

## Images

**Hero Section:** None - This is a functional platform, not marketing. Jump directly to dashboard/content.

**Event Cards:** Placeholder images representing event types (networking, workshop, speaker series) - 16:9 ratio, professional stock photos or university brand patterns.

**Video Thumbnails:** Auto-generated from video or admin-uploaded custom thumbnails - 16:9 ratio.

**Profile Avatars:** Default avatar icons (Heroicons user-circle) with option for member uploads (circular crop).

**Login Screens:** Left panel background - subtle image of university campus or abstract business/finance themed graphic (low opacity overlay to maintain text readability).