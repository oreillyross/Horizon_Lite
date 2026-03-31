Context
The existing NavigationBar is a single sticky header bar handling all nav links, auth state, and search. The user wants to refactor it into a two-bar layout:

TopBar — branding + search + authenticated user avatar/dropdown (or sign-in links)
SubNavigationBar — a secondary bar below the top bar holding all page navigation links

This also involves renaming Horizon → Trends, removing Profile and Webcut as standalone nav items, and folding Webcut functionality into Intel Feed and Sources pages.

What Changes
NavigationBar (TopBar) — refactored

Keep: Brand ("Horizon Lite"), GlobalSearch
Remove: All page nav links (move to SubNavigationBar)
Remove: Inline Login/Logout/Admin links
Add: Authenticated user avatar (right side)

Shows first two initials if no avatar image
Dropdown: Profile, Logout


Replace with: "Sign In" + "Sign Up" links when not authenticated (Sign In links to / which already has sign-up nav)

SubNavigationBar — new component
Links (in order):
Display NamehrefSnippets/snippet/showThemes/themesTags/tags/showTrends/horizon/overviewIntel Feed/intel/feedSources/sources/recent

Active route highlighting (reuse isActiveRoute() from NavigationBar)
Sticky, sits directly below the TopBar (top-14)
Responsive: collapses to a horizontal scroll or hamburger on mobile
Does NOT include Profile, Webcut, or Create links

App.tsx

Remove Profile and Webcut from items array passed to NavigationBar
Add <SubNavigationBar /> below <NavigationBar /> (no props needed — links are static)

Route/feature notes

/intel/feed — Webcut UI to be embedded in this page (separate task)
/sources/recent — Webcut UI to be embedded here too (separate task)
These route-level changes are out of scope for this spec; spec only covers nav structure


Files
FileChangeclient/src/components/NavigationBar.tsxRefactor: remove nav links, add user avatar dropdownclient/src/components/SubNavigationBar.tsxNew component with 6 page linksclient/src/App.tsxUpdate items, add <SubNavigationBar />docs/specs/feature_navigation_v2.mdNew spec file (primary deliverable)

Reusable Patterns

isActiveRoute(pathname, href) — already in NavigationBar.tsx, extract to lib/utils or duplicate in SubNavigationBar
cn() utility — @/lib/utils
useSession() hook — @/hooks/useSession (provides user, isAuthenticated, isLoading)
trpc.auth.logout mutation — already wired in NavigationBar
GlobalSearch component — keep in TopBar


Spec File to Create
Path: docs/specs/feature_navigation_v2.md
Contents:

Context / motivation
Two-bar layout description
TopBar spec (props, visual mockup, behaviour)
SubNavigationBar spec (props, links table, active state, responsive)
UserAvatar dropdown spec
Auth states (authenticated vs guest)
App.tsx wiring
Out-of-scope notes (Webcut integration is a follow-on task)


Verification

Read docs/specs/feature_navigation_v2.md to confirm it matches all requirements
Check that NavigationBar.tsx refactor removes nav links and adds avatar dropdown
Check SubNavigationBar.tsx renders correct 6 links with active state
Check App.tsx renders both bars correctly
Run existing NavigationBar tests: npm test NavigationBar
