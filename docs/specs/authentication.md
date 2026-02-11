# Authentication & Authorization Spec (Horizon Lite)

**Status:** Draft

## Goals

* Add first-class authentication to Horizon Lite with a clean UX.
* Show logged-in state in the navbar (avatar + menu); show Login/Sign up when logged out.
* Support **email + password** now, with an **optional passwordless magic-link** mode available.
* Enable future OAuth (Google + Microsoft) via OpenAuth (or equivalent) without reworking core tables.
* Introduce **Analyst Groups** and **RBAC**:

  * Every snippet belongs to an Analyst Group.
  * User is assigned to one Analyst Group (initially one; later allow many).
  * Admin dashboard: manage users, roles, and group membership.
* Secure all data by default (multi-tenant isolation by analyst group).

## Non-goals (for first iteration)

* Multi-factor auth (MFA)
* Complex org/team structures (multiple groups per user)
* SCIM / enterprise provisioning
* Fine-grained permissions beyond Admin vs Analyst

---

## Recommended login approach

### Phase 1 (MVP): Email + Password

* Fastest path, lowest UX friction for your current build.
* Works offline-ish (no email deliverability dependency).
* You can still add passwordless as a **toggle** later.

### Phase 2 (Add-on): Passwordless Magic Link

* Add a `login_method` option and routes for magic link.
* Requires email sending + token verification.

### Phase 3: OAuth (Google/Microsoft)

* Add identity-provider records and link accounts.

**Decision:** Implement Phase 1 now, architect tables so Phase 2/3 plug in cleanly.

---

## User stories

### Authentication

1. As a visitor, I can sign up with email + password.
2. As a user, I can log in and stay logged in across page refresh.
3. As a user, I can log out.
4. As a user, I can reset my password via email.
5. As a user, I can (later) request a magic link to log in.
6. As a user, I can (later) sign in with Google or Microsoft.

### Authorization & tenancy

7. As an analyst, I only see snippets/tags/themes/sources belonging to my Analyst Group.
8. As an admin, I can access a protected Admin dashboard.
9. As an admin, I can create Analyst Groups.
10. As an admin, I can assign users to Analyst Groups.
11. As an admin, I can set user roles (admin/analyst).

---

## UX / UI spec

### Navbar

* **Logged out:** show `Login` and `Sign up` buttons.
* **Logged in:** show avatar (or initials) + dropdown:

  * Profile
  * Settings (optional)
  * Admin Dashboard (only if role=admin)
  * Log out
* Optional: show current Analyst Group name in dropdown.

### Routes

* Public:

  * `/login`
  * `/signup`
  * `/forgot-password`
  * `/reset-password?token=...`
* Protected:

  * App routes (snippets, themes, tags, sources) require auth.
  * `/admin` requires `role=admin`.

### Loading / session

* App boot should show a minimal loading state while checking session.
* If session invalid/expired, redirect to `/login`.

---

## Data model changes

### Tables

#### `users`

Add/ensure columns:

* `id` (uuid)
* `email` (unique, lowercased)
* `passwordHash` (nullable if passwordless-only)
* `displayName` (nullable)
* `avatarUrl` (nullable)
* `role` enum: `admin | analyst` (default `analyst`)
* `analystGroupId` (uuid, FK -> analyst_groups.id, nullable for bootstrapping)
* `createdAt`, `updatedAt`

#### `analyst_groups`

* `id` (uuid)
* `name` (text, unique-ish)
* `createdAt`

#### (Optional now, recommended for Phase 2/3)

`user_identities`

* `id` (uuid)
* `userId` (FK)
* `provider` enum: `password | magic_link | google | microsoft`
* `providerSubject` (text) // sub/id from provider
* `createdAt`

`magic_link_tokens`

* `id` (uuid)
* `userId` (FK)
* `tokenHash` (text)
* `expiresAt`
* `usedAt` (nullable)

`password_reset_tokens`

* `id` (uuid)
* `userId` (FK)
* `tokenHash` (text)
* `expiresAt`
* `usedAt` (nullable)

### Weaving user/group into existing entities

**Principle:** every tenant-owned row should have `analystGroupId` and be filtered server-side.

#### `snippets`

* Add `analystGroupId uuid NOT NULL` (FK -> analyst_groups.id)
* Optionally add `createdByUserId uuid` (FK -> users.id)

#### `themes`

* Add `analystGroupId uuid NOT NULL`

#### `tags` (if you have a table)

* Add `analystGroupId uuid NOT NULL`

#### `sources` / `recent_source_items` (if persisted)

* Add `analystGroupId uuid NOT NULL`

### Migrations

* Create `analyst_groups` table.
* Backfill: create a default group (e.g. “Default”).
* Add `users.analystGroupId` and set existing users to default group.
* Add `analystGroupId` to snippets/themes/etc. and backfill to default group.
* Add NOT NULL constraints after backfill.

---

## Auth mechanics (backend)

### Session strategy

**Recommended:** HTTP-only cookie session.

* Server issues a signed session cookie after login.
* On each request, middleware loads the session and attaches `ctx.user`.

Session data:

* `userId`
* `role`
* `analystGroupId`
* `issuedAt`, `expiresAt`

### Passwords

* Use bcrypt/argon2.
* Enforce:

  * min length 10
  * basic password rules
  * rate limit login attempts

### Middleware / guards

* `requireAuth`: rejects unauthenticated requests.
* `requireAdmin`: rejects if `ctx.user.role !== 'admin'`.

### Multi-tenant filtering

All list/read/mutate procedures for tenant-owned entities must:

* filter by `ctx.user.analystGroupId`
* when creating, set `analystGroupId = ctx.user.analystGroupId`
* never accept `analystGroupId` from the client for these entities

---

## tRPC API spec

### Auth router

* `auth.getSession` -> returns `{ user: { id, email, displayName, avatarUrl, role, analystGroupId } } | null`
* `auth.signup` (email, password, displayName?) -> creates user, assigns default group, returns session
* `auth.login` (email, password) -> returns session
* `auth.logout` -> clears cookie
* `auth.requestPasswordReset` (email) -> send email if user exists (don’t reveal existence)
* `auth.resetPassword` (token, newPassword)

### Admin router (protected)

* `admin.listUsers` -> users (paged)
* `admin.listGroups`
* `admin.createGroup` (name)
* `admin.assignUserToGroup` (userId, groupId)
* `admin.setUserRole` (userId, role)

---

## Frontend spec

### State

* Introduce `useSession()` hook backed by `trpc.auth.getSession.useQuery()`.
* Store session in React Query cache.

### Route protection

* A `ProtectedRoute` wrapper:

  * if session loading -> show skeleton
  * if no session -> redirect to `/login`

* An `AdminRoute` wrapper:

  * requires session and `role=admin`

### Screens

* Login Screen:

  * email, password
  * submit
  * link to sign up and forgot password

* Sign up Screen:

  * email, password, display name

* Admin Dashboard:

  * tabs: Users, Groups
  * Users table: email, role, group
  * Actions: assign group (dropdown), change role

---

## Security & compliance

* CSRF protection for cookie auth (same-site cookies + CSRF token if needed).
* Rate limit:

  * login attempts
  * password reset requests
* Avoid user enumeration:

  * password reset always returns success message.
* Audit logging (future): admin actions.

---

## Rollout plan

### Step 0: Prep

* Add session middleware and `ctx.user` typed.

### Step 1: Tables + migrations

* Create analyst_groups
* Add user.role + user.analystGroupId
* Backfill and add constraints

### Step 2: Auth router + screens

* Signup/login/logout
* Navbar session UI

### Step 3: Tenant isolation

* Update all tRPC procedures to filter/set analystGroupId

### Step 4: Admin dashboard

* CRUD groups + assign users + set roles

### Step 5: Optional add-ons

* Password reset
* Magic link
* OAuth (Google/Microsoft)

---

## Open questions (defaults assumed for MVP)

* **Single group per user** for now (simpler). Later expand to membership table.
* **Default group** exists and new users go into it until admin reassigns.
* **Only admins** can assign groups and roles.
