Below is a **`spec.md`** you can drop into `docs/specs/webcut/spec.md` (or `/specs/webcut/spec.md`) as the source of truth. It’s aligned with the “developer tools” UI vibe from your project’s design guidelines. 

---

## spec.md — WebCut (Webview + Inline Snippet Capture)

### 0) Goal

Add a **WebCut** feature that lets a user:

1. Open a simple “web text viewer” screen by entering a URL
2. Select text on the page
3. On mouse-up (left click release), show a small inline popover with **“Add snippet”**
4. Save the selection as a new snippet (with source metadata)
5. Immediately review/edit captured snippets (tags, content tweaks), with a quick “Recently added” filter

This is the foundation for later **agentic AI tagging** and enrichment.

---

### 1) Non-goals (for MVP)

* No “full fidelity browser” expectations (video, complex interactions, logins, cross-site forms).
* No PDF viewer (unless it happens to render as text cleanly).
* No perfect readability for every site (some sites will block embedding or require JS; that’s okay for MVP).
* No highlight persistence inside the web page (nice-to-have later).

---

### 2) User stories

**US1 — Open a page**

* As a user, I can paste a URL and load its content into a reading view.

**US2 — Capture a selection**

* As a user, I can select text and quickly save it as a snippet without leaving the page.

**US3 — Review captured snippets**

* As a user, I can immediately see what I captured and edit it (content + tags).

**US4 — Source traceability**

* As a user, each snippet remembers where it came from (URL + title + captured timestamp, optionally selection offsets later).

---

### 3) UX / Screens

#### 3.1 WebCut Screen (new)

Route suggestion: `/webcut`

Layout:

* Top bar:

  * URL input (full width)
  * “Go” button
  * Optional: “Open Snippets” shortcut (to recent captures)
* Main:

  * **Reader panel** (the page content)
  * Optional right side panel (later): captured snippets list / session

MVP Reader behavior options (choose simplest first):

* **Option A (recommended): Readability extraction on the server**

  * Server fetches HTML, extracts main content text (Mozilla Readability or similar), returns sanitized HTML/text.
  * Render inside your app (safe, controllable selection).
* **Option B: iframe**

  * Load URL in an iframe and attempt selection capture.
  * Often blocked by `X-Frame-Options` / CSP + cross-origin selection issues.
  * Probably frustrating for MVP.

**Recommendation: Option A** so selection + popover is reliable and consistent.

Reader UI:

* Render extracted content in a styled container:

  * comfortable max width (e.g. `max-w-3xl`)
  * prose styling (Tailwind Typography if installed; otherwise simple spacing)
  * keep it “tool-like” not bloggy.

#### 3.2 Inline capture popover

Trigger:

* User selects text in reader container
* On `mouseup`:

  * if selection length > min (e.g. 3 chars) and selection is within reader container
  * show small popover near the selection (or near mouse coords)

Popover content (compact):

* Primary action: **Add snippet**
* Small metadata line:

  * `Source: <hostname>` (or title truncated)
  * `Chars: N` (optional but nice)

Popover behavior:

* Clicking outside closes it
* Press `Esc` closes it
* If user changes selection, popover updates position/preview
* If selection becomes empty, popover hides

After “Add snippet”:

* Save snippet
* Show a tiny toast: “Snippet captured”
* Popover closes
* Selection can remain or be cleared (either is fine)

#### 3.3 Snippet View: “Recently added”

You already have a snippet list/view. Add:

* A filter pill or dropdown: **All / Recently added**
* “Recently added” definition:

  * captured within last X minutes/hours (e.g. 24h), OR
  * last N created snippets (e.g. 20) sorted by createdAt desc

Also add a quick edit affordance:

* After capture, user should be able to:

  * adjust content
  * add tags
  * save

---

### 4) Data model changes

#### 4.1 Snippet entity additions (minimal)

Add optional fields to snippet schema:

* `sourceUrl?: string`
* `sourceTitle?: string`
* `sourceHost?: string`
* `capturedAt?: Date` (or reuse createdAt; but capturedAt is useful if you later import/backfill)
* `sourceQuote?: string` (optional; could store same as content, but a separate “quote” field is useful if content later diverges)

If you don’t want new fields yet, the bare minimum is:

* store `sourceUrl` + `sourceTitle` + `sourceHost` alongside snippet content.

#### 4.2 (Later) Selection anchoring

For robust “return to exact spot”, you can later store:

* text offsets
* DOM path selectors
* or a “TextQuoteSelector” approach (like Web Annotation Data Model)

Not MVP.

---

### 5) Backend / API

#### 5.1 Fetch & extract endpoint (MVP)

New API procedure (tRPC):

* `webcut.fetchReadable({ url }) -> { title, byline?, siteName?, contentHtml, textContent?, host }`

Server responsibilities:

* Validate URL scheme (`http/https` only)
* Fetch with sane timeout + max size
* Extract main content (readability)
* Sanitize output (strip scripts/iframes/unsafe attrs)
* Return structured data

Error handling:

* If blocked / fetch fails:

  * return error with user-friendly message
  * UI shows “Couldn’t load page. Try another URL.”

#### 5.2 Create snippet from selection

Use existing `createSnippet` but pass metadata fields:

* content = selected text
* tags = [] initially
* source fields from fetched page state + url

Optional: `webcut.createSnippetFromSelection({ selectionText, sourceUrl, sourceTitle, sourceHost })`

---

### 6) Frontend behavior details

#### 6.1 WebCut state machine (simple)

State:

* `urlInput`
* `loadedUrl`
* `page: { title, host, contentHtml } | null`
* `selection: { text, rect } | null`
* `popoverOpen: boolean`

Flow:

1. Enter URL -> click Go
2. call `trpc.webcut.fetchReadable.useQuery` (or mutation) to load page
3. Render page content
4. On selection, show popover
5. On Add snippet -> call `trpc.createSnippet.useMutation`
6. Invalidate:

   * snippet list queries
   * tags queries if you compute tag counts from snippets
7. Optional: show “recently added” pill highlighted

#### 6.2 Selection detection rules

* Only allow selection inside the reader container element
* Ignore selections that are:

  * whitespace-only
  * too short
  * extremely long (optional cap like 5k chars to prevent accidental huge saves)

Popover positioning:

* Use `Range.getBoundingClientRect()` if available
* Fallback to mouse coordinates

---

### 7) Acceptance criteria (MVP)

* [ ] User can paste a URL and see extracted readable text content.
* [ ] Selecting text triggers a small popover near the selection.
* [ ] Clicking “Add snippet” creates a snippet with the selected text + source metadata.
* [ ] Snippet list has a “Recently added” filter or quick toggle.
* [ ] Newly created snippet appears in “Recently added” immediately (after mutation invalidation).
* [ ] Errors (fetch fail, snippet create fail) show a clear message and do not crash the page.

---

### 8) Implementation plan (small steps)

**Step 1 — Route + screen scaffold**

* Add `/webcut` route
* Add basic layout: URL input + empty reader state

**Step 2 — Backend readability fetch**

* Implement `webcut.fetchReadable`
* Render returned HTML/text in the reader container

**Step 3 — Selection + popover**

* Add selection detection limited to reader container
* Implement popover UI + close behavior

**Step 4 — Save selection as snippet**

* Wire “Add snippet” -> `createSnippet`
* Add metadata fields (schema migration + server changes)

**Step 5 — Recently added filter**

* Add UI filter to snippet list
* Add query support (or client-side filter on sorted list for MVP)

**Step 6 — Polish**

* Keyboard: `Esc` closes popover
* Toasts
* Loading skeletons
* Better empty/error states

---

### 9) Future extensions

* Agentic AI tagging:

  * after capture, async job suggests tags (human-in-the-loop confirm)
* Multi-snippet “session” panel on the right
* Highlight captured text in reader
* Persistent anchor selectors + “jump to source”
* Batch capture + one-click “tag all”

---

If you want, next message I’ll start **Step 1** with concrete file-level edits (route + `WebCutScreen.tsx` skeleton + nav link), and we’ll keep it tight and incremental.
