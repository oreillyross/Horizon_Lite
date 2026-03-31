# Feature: Navigation v2 — Two-Bar Layout

## Context

The original NavigationBar combined page links, auth controls, and search into a single bar. As the app has grown (9+ nav items, auth states, admin links), this has become cluttered. v2 separates concerns into two distinct bars:

- **TopBar** — branding, global search, and user account controls
- **SubNavigationBar** — all page navigation links

## Visibility Rules

- Subnavigation bar: Hidden when user is not authenticated
- Search bar: Hidden when user is not authenticated
- Main nav items (home, login / signup.): Always visible

This also removes `Profile` and `Webcut` as standalone nav links. Profile moves into the user avatar dropdown. Webcut functionality will be embedded directly into the Intel Feed and Sources pages (separate tasks).

---

## Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Horizon Lite    [    Global Search     ]    [Avatar ▾] / Sign In│  ← TopBar (sticky, z-40)
├─────────────────────────────────────────────────────────────────┤
│  Snippets  Themes  Tags  Trends  Intel Feed  Sources             │  ← SubNavigationBar (sticky, z-30)
└─────────────────────────────────────────────────────────────────┘
```

---

## TopBar (refactored `NavigationBar.tsx`)

### Responsibilities
- Brand name link ("Horizon Lite" → `/`)
- GlobalSearch (centered, hidden on xs, full-width below on mobile)
- Auth controls (right side)

### Auth States

**Authenticated:**
```
[Avatar: "JD" or photo]  ▾
  ├── Profile  →  /profile
  └── Logout
```
Avatar shows the user's first two initials (uppercase) when no profile picture is available. Uses a circular badge styled consistently with the shadcn theme.

**Guest:**
```
Sign In   Sign Up
```
- "Sign In" links to `/` (the login page, which already contains a sign-up navigation link)
- "Sign Up" links to `/signup`

### Props
```tsx
interface NavigationBarProps {
  // no items prop — nav links move to SubNavigationBar
}
```

### Behaviour
- Sticky (`top-0`), `z-40`, border-b, `bg-background/80 backdrop-blur`
- Height: `h-14`
- Removes the dynamic `themeId` "Current theme" injection (no longer needed here)
- Mobile: hamburger menu removed — search stays, auth controls stay visible

---

## SubNavigationBar (new `SubNavigationBar.tsx`)

### Responsibilities
- Renders the 6 primary page navigation links
- Highlights the active route

### Links (fixed, no props required)

| Display Name | href |
|---|---|
| Snippets | `/snippet/show` |
| Themes | `/themes` |
| Tags | `/tags/show` |
| Trends | `/horizon/overview` |
| Intel Feed | `/intel/feed` |
| Sources | `/sources/recent` |

> **Note:** "Trends" replaces the previous "Horizon" label. The route (`/horizon/overview`) is unchanged in this spec; a route rename is a separate task.

> **Note:** "Webcut" is removed. Webcut functionality will be embedded into the Intel Feed page and the Sources page as follow-on tasks.

### Active State
Reuses the same `isActiveRoute(pathname, href)` logic from the current `NavigationBar.tsx`. The active link receives `bg-muted text-foreground`; inactive links receive `text-muted-foreground hover:text-foreground hover:bg-muted/60`.

### Props
```tsx
// No props — links are static and defined inside the component
export default function SubNavigationBar() { ... }
```

### Styling
- Sticky (`top-14`), `z-30`, border-b, `bg-background/80 backdrop-blur`
- Height: `h-10`
- Links: `text-sm font-medium`, `px-3 py-1.5`, `rounded-md`
- Mobile: horizontally scrollable (`overflow-x-auto`, `whitespace-nowrap`, no wrap), no hamburger

### Visual mockup
```
│  Snippets  Themes  Tags  Trends  Intel Feed  Sources             │
│  ^^^^^^^^ (active: bg-muted)                                     │
```

---

## App.tsx Wiring

```tsx
<NavigationBar />
<SubNavigationBar />
<Router />
```

- Remove `Profile` and `Webcut` from the items array (items prop is removed entirely)
- `SubNavigationBar` is placed directly below `NavigationBar` before the router outlet

---

## Out of Scope (follow-on tasks)
- Embedding Webcut UI into `/intel/feed` page
- Embedding Webcut UI into `/sources/recent` page
- Renaming the `/horizon/*` route prefix to `/trends/*`
- Mobile hamburger for SubNavigationBar (horizontal scroll is sufficient for v2)
- Admin link in TopBar (remains accessible via `/admin` directly or future admin menu)

---

## Files to Create / Modify

| File | Change |
|---|---|
| `client/src/components/NavigationBar.tsx` | Remove nav link items + mobile panel; add user avatar dropdown |
| `client/src/components/SubNavigationBar.tsx` | New — 6 static page links, active state, horizontal-scroll on mobile |
| `client/src/App.tsx` | Remove items prop, add `<SubNavigationBar />` |

---

## Acceptance Criteria

- [ ] TopBar renders brand, search, and avatar dropdown (or sign-in links) only — no page nav links
- [ ] Avatar shows two initials when no profile image is available
- [ ] Avatar dropdown shows Profile and Logout when authenticated
- [ ] Guest state shows Sign In and Sign Up links
- [ ] SubNavigationBar renders all 6 links in the specified order
- [ ] Active link is visually highlighted based on current route
- [ ] SubNavigationBar is horizontally scrollable on mobile without wrapping
- [ ] Both bars are sticky and do not overlap each other
- [ ] Profile and Webcut links are removed from all nav surfaces
- [ ] Existing NavigationBar tests are updated / pass
