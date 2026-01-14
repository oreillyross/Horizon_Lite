# Design Guidelines: Full-Stack Starter Application

## Design Approach
**System-Based Approach** inspired by modern developer tools (Linear, Vercel, Supabase Dashboard)

This application prioritizes clarity, efficiency, and immediate access to functionality. Draw from established patterns in developer tooling where information density and quick navigation are paramount.

## Core Design Elements

### A. Typography
- **Primary Font**: Inter or SF Pro (via Google Fonts CDN)
- **Monospace**: JetBrains Mono for code snippets and database values
- **Hierarchy**:
  - Page titles: text-3xl font-semibold
  - Section headers: text-xl font-medium
  - Body text: text-base
  - Labels/captions: text-sm
  - Code/data: text-sm font-mono

### B. Layout System
**Spacing Units**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 or p-6
- Section gaps: gap-6 or gap-8
- Page margins: px-6 lg:px-8
- Form field spacing: space-y-4

**Grid Structure**:
- Sidebar navigation: w-64 fixed
- Main content: max-w-7xl with responsive padding
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Data tables: Full-width with horizontal scroll on mobile

### C. Component Library

**Navigation**:
- Fixed sidebar with logo, navigation links, and user profile at bottom
- Breadcrumb navigation for deep hierarchies
- Top bar with page title and primary actions

**Dashboard Components**:
- Stat cards with metric, label, and trend indicator
- Recent activity feed with timestamps
- Quick action buttons prominently placed

**Data Display**:
- Tables with sortable headers, alternating row treatment
- Empty states with clear CTAs
- Loading skeletons matching content structure
- Pagination controls at bottom

**Forms**:
- Grouped fields with clear labels above inputs
- Validation messages inline below fields
- Submit button right-aligned or full-width on mobile
- Input heights: h-10 for text fields, h-24 for textareas

**Interactive Elements**:
- Buttons: px-4 py-2, rounded-md, font-medium
- Icon buttons: h-10 w-10, rounded-md
- Tabs for content switching
- Modals: max-w-2xl, centered, with backdrop

### D. Animations
Use sparingly for feedback only:
- Loading spinners for async operations
- Fade-in for data fetches (duration-200)
- Slide-in for modals and drawers (duration-300)
- No scroll animations or decorative effects

## Application Structure

**Dashboard Layout**:
- Welcome section with user name and quick stats (3-4 metrics in cards)
- Database connection status indicator
- Recent queries/operations table
- Quick action cards for common tasks (Create Record, View Schema, Run Query)

**Database View**:
- Table list sidebar or dropdown selector
- Schema visualization with field types
- CRUD operations toolbar
- Data grid with inline editing capabilities

**Settings/Configuration**:
- Two-column layout on desktop (navigation + content)
- Grouped settings sections
- Form-based configuration with save/cancel actions

## Icons
Use **Heroicons** (outline style) via CDN for consistent, minimal iconography throughout the application.

## Images
No hero images required. This is a functional dashboard application. Use placeholder avatars for user profiles and empty state illustrations where appropriate.