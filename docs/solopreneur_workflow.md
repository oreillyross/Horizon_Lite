

### Step‑by‑step workflow

1. **Open your app as a user**
   - Use the deployed build (staging or production), not your local dev server.
   - Sign in or use the app exactly like a new user would.
   - Take notes on anything that breaks flow: layout misalignments, long load times, unexpected errors.

2. **Keep GitHub Issues open in a separate browser tab**
   - For each friction point, click **“New issue”**.
   - Follow a **consistent issue template**:
     ```
     **Title:** [Bug/UX/Performance]: short description  
     **Steps to reproduce:**  
     1. ...
     2. ...
     **Expected result:** ...
     **Actual result:** ...
     **Environment:** (browser, platform, app version)
     **Priority:** high/medium/low  
     **Screenshot/Recording:** (paste image or Loom link)
     ```
   - Tag appropriately (`bug`, `frontend`, `UX feedback`, `v1.2`, etc.).
   - Assign the issue to yourself or your dev alias.

3. **Add quick contextual notes**
   - If time allows, link directly to suspected code areas (`#L23` references).
   - Mention reproduction consistency (e.g., “Occurs every refresh”, “Only on mobile view”).

4. **End of session summary**
   - Commit all your findings by labeling them `dogfood-test-{date}`.
   - Optionally add a short markdown note in `/docs/testing-feedback.md` summarizing patterns (e.g., “Buttons lack feedback tone on submit”).

***

### Developer mode follow‑up (GitFlow + CI)

1. **Create a hotfix or feature branch:**  
   `git checkout -b fix/login-timeout-issue`

2. **Fix issues and commit clearly:**  
   `git commit -m "Fix: login timeout during dogfood test 2026-02-03"`

3. **Push and open a pull request:**  
   - Include a reference to the GitHub Issue (e.g., “Closes #42”).
   - Let CI run your automated tests on the PR.
   - Merge only after passing CI and, ideally, self‑review or peer review.

4. **Tag and deploy**
   - When merged to `main`, use CI/CD to deploy and confirm the fix in staging or production.
   - Close the issue with confirmation comment.

***

### Example

Imagine you notice the “Save” button doesn’t show spinner feedback.  
- You create an issue: `UX: Save button doesn’t show feedback after clicking`  
- Add steps, priority = medium, screenshot attached.  
- Later, you pick it up as a small fix branch, write a quick test, and merge through a PR.  
Next dogfooding session — you verify it’s smooth.

***
