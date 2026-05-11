# Build Guide: Web App Development with Perplexity, Supabase & GitHub

This document serves as a reusable educational reference for the process used to scaffold, document, and build this application. It captures the methodology so that it can be repeated for future projects or taught to others.

---

## The Process

This project was built using a three-platform workflow:

| Platform | Role |
|---|---|
| **Perplexity** | AI assistant — architecture decisions, documentation generation, code generation, schema design, debugging |
| **Supabase** | Backend — PostgreSQL database, authentication, edge functions, API layer |
| **GitHub** | Version control — repository, documentation, code, and progress tracking |

---

## Step-by-Step Setup

### Step 1 — Create a Perplexity Space
- Create a new Space in Perplexity
- Spaces allow you to maintain persistent context across conversations for a single project
- Name the Space after the project so conversations stay organized

### Step 2 — Connect a Supabase Account
- Link your Supabase account to Perplexity via the Supabase MCP integration
- This gives Perplexity direct access to list projects, apply migrations, execute SQL, manage edge functions, and run advisors
- Identify which Supabase project will be used and confirm the project ID
- If the project is shared with other schemas, confirm the isolated schema name to be used (e.g., `parts_matcher`)

### Step 3 — Connect a GitHub Account
- Link your GitHub account to Perplexity via the GitHub MCP integration
- This gives Perplexity direct access to create repositories, push files, manage branches, and track issues
- Confirm the GitHub username so the correct account is targeted

### Step 4 — Write the Setup Prompt

The setup prompt is the single most important input. It defines everything Perplexity needs to scaffold the project. It should contain four sections:

---

#### Section 1: The Idea

Describe what the app does in plain language. Include:
- Who the business is
- What problem is being solved
- What the app will allow users to do
- Any relevant external references (e.g., product catalog URLs)

**Example:**
```
We're going to build an app for an industrial machine parts distributor. We sell the categories 
of products shown at https://www.easternia.com/products. The app will allow users to reference 
part spec requirements for types of products (dimensions, ratings, etc as appropriate to the 
product). Users will also be able to enter spec information to generate potential item matches.
```

---

#### Section 2: The User Story

Describe the core workflow from the perspective of a real user. Walk through a specific scenario end-to-end. Include:
- Who the user is (role)
- What triggers the workflow
- Each action the user takes
- What the system returns
- Any backend roles (e.g., database administrator)
- The stated objective (the “why”)

**Example:**
```
Consider the platform story from a sales representative's perspective who is responding to a 
customer request for a conveyor roller. The customer wants to know what information they need 
to provide. The sales representative uses the app to generate a document that shows what is 
needed to appropriately quote a conveyor roller. The customer responds with the information. 
The sales representative enters the values into the app and the app returns potential matches. 
All data references are stored in a backend database maintained by a database administrator 
through appropriate tools to ensure data integrity. Data will originally be sourced from 
public-facing catalogs supplied by the brands we supply. The database will be a repository 
for vendor relationships to consider priority selection when multiple brands offer a similar 
product. The objective is to reduce the redundant effort of researching multiple locations 
for quote information that can be consolidated and more easily processed.
```

---

#### Section 3: Repo & Supabase Targets

Tell Perplexity exactly where to build:
- Whether to create a new GitHub repo or use an existing one
- The repo name and visibility (public/private)
- Which Supabase project to use (by name or ID)
- The schema name to isolate this project's data

**Example:**
```
Create a new private GitHub repo under andredavisme. Use the andredavisme's Project in 
Supabase to create the schema. Keep this schema separate from the others.
```

---

#### Section 4: Progress Update Document

Request a living milestone tracker be included in the repo. Specify:
- That it is a living document updated throughout development
- What each milestone entry must contain
- Who the audience is (developer handoff, chunked work sessions)

**Example:**
```
Include a progress update document in the repo where we will record milestones and track 
development. Each milestone will reference the work previously done, dependencies for 
progression, the work completed with the errors and fixes that were implemented during 
development of the milestone, and the next steps in development. A developer will be able 
to reference this so that they can work in chunks or hand off progression.
```

---

## What Perplexity Produces

From a well-formed setup prompt, Perplexity will:

1. Fetch any referenced URLs for context (product catalogs, existing sites, etc.)
2. Identify the correct Supabase project and confirm its ID
3. Identify the GitHub account and create or target the specified repository
4. Push a full documentation suite to the repo in a single commit:
   - `README.md` — project overview, user roles, workflow, tech stack, doc index
   - `docs/product-objective.md` — business problem, scope, success criteria
   - `docs/data-architecture.md` — schema design, entities, vendor logic, integrity rules
   - `docs/quote-workflow.md` — end-to-end workflow with a worked example
   - `docs/progress-tracker.md` — living milestone log with full handoff structure
   - `docs/build-guide.md` — this document
5. Record Milestone 0 (Project Initialization) as complete in the progress tracker
6. Define all forward milestones with dependencies and next steps

---

## Migration Conventions

Database schema changes are applied via Supabase's `apply_migration` tool, which tracks each migration by name in the `supabase_migrations` table. The following conventions are used on this project:

- **Naming:** `snake_case`, descriptive of the scope — e.g., `create_parts_matcher_schema_and_reference_tables`
- **Grouping:** Related tables are batched into a single migration (e.g., all reference tables together, all workflow tables together)
- **Separation of concerns:** DDL (schema creation) is always a separate migration from RLS policies. This makes it easier to re-apply or audit security changes independently.
- **Seed data:** Initial seed data is applied via `execute_sql` (not `apply_migration`) since it is not structural DDL and may be updated by administrators over time
- **Idempotency:** All seed inserts use `ON CONFLICT DO NOTHING` so they can be safely re-run
- **Audit columns:** Every mutable table includes `created_at`, `updated_at`, and `created_by` columns
- **Soft deletes:** Reference and catalog tables use an `is_active boolean` flag rather than hard deletes to preserve relational integrity

---

## Admin Access Pattern

This project uses a **JWT app_metadata claim** to control administrator write access, rather than a separate Supabase role or a dedicated admin table. This pattern works well for internal tools on a shared Supabase project where creating custom database roles is impractical.

### How It Works

1. A helper function `parts_matcher.is_admin()` reads the authenticated user's JWT:
   ```sql
   SELECT coalesce(
     (auth.jwt() -> 'app_metadata' ->> 'parts_matcher_role') = 'admin',
     false
   );
   ```
2. RLS policies on all reference and catalog tables use this function in their `USING` and `WITH CHECK` clauses
3. Standard `authenticated` users get read-only access; only users with the claim get write access

### Granting Admin Access

In the Supabase dashboard:
1. Go to **Authentication → Users**
2. Select the user
3. Edit **App Metadata** and add:
   ```json
   { "parts_matcher_role": "admin" }
   ```
4. The user’s next authenticated request will carry the updated claim

### Why This Approach
- No custom PostgreSQL roles needed
- Claim is project-namespaced (`parts_matcher_role`) so it does not conflict with claims used by other schemas on the same Supabase instance
- Revocable instantly by removing the claim from app_metadata
- Reusable pattern: any future schema on this instance can define its own namespaced claim

---

## Frontend Stack: GitHub Pages + Supabase JS

This project uses **vanilla HTML/CSS/JavaScript** hosted on **GitHub Pages** as the frontend. This is a deliberate choice for an internal tool: no build pipeline, no framework overhead, easy to read and maintain by non-frontend developers.

### Hosting Setup
- Source lives in a `gh-pages` branch of the same repository (`andredavisme/parts-spec-matcher`)
- GitHub Pages serves the branch directly at `https://andredavisme.github.io/parts-spec-matcher/`
- No CI/CD required — pushing to `gh-pages` deploys immediately
- **GitHub auto-enables Pages when the branch is named exactly `gh-pages`.** No manual configuration in Settings is required when using this branch name. If you use any other branch name (e.g., `frontend`, `main`), you will need to manually enable Pages via **Settings → Pages → Source: Deploy from branch**.

### Supabase JS Client
The frontend connects to Supabase using the `@supabase/supabase-js` CDN build (no npm required):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/config.js"></script>
```

```javascript
// js/config.js
// IMPORTANT: do NOT name this variable "supabase" — it collides with the CDN global.
// Use a project-specific name like "sbClient".
const sbClient = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_ANON_KEY');
```

- Use the **anon key** (not the service role key) — safe for browser exposure
- All data access is protected by Supabase Auth + RLS policies
- The anon key and project URL are safe to commit to the `gh-pages` branch since RLS enforces all access control

### Auth Flow
Authentication uses Supabase’s built-in email/password provider:

```javascript
// Sign in
const { data, error } = await sbClient.auth.signInWithPassword({ email, password });

// Sign out
await sbClient.auth.signOut();

// Check session on page load
const { data: { session } } = await sbClient.auth.getSession();
if (!session) { /* show login view */ }
```

- Sales rep accounts are created in the Supabase dashboard under **Authentication → Users**
- Admin access is granted by adding `{ "parts_matcher_role": "admin" }` to a user’s **App Metadata**
- The frontend checks for the admin claim to show/hide admin UI elements:
  ```javascript
  const isAdmin = session?.user?.app_metadata?.parts_matcher_role === 'admin';
  ```

### Non-Public Schema Access Pattern

Supabase PostgREST only exposes the `public` schema by default. Calling tables or functions in a custom schema (e.g., `parts_matcher`) requires one of:

1. **Adding the schema to PostgREST’s exposed schemas list** — done via the Supabase Dashboard under **Project Settings → API → Exposed schemas**. Cannot be set via SQL as Supabase’s managed configuration overrides it.
2. **Creating `public` wrapper views/functions** — the approach used in this project. Create `public.pm_*` views over each `parts_matcher` table, and a `public.run_match()` wrapper over `parts_matcher.run_match()`. All JS queries then target the `public` schema normally with no `.schema()` call.

**Key rules for wrapper views:**
- Set `security_invoker = false` (the default / security definer). Setting `security_invoker = true` on a view that wraps a non-public schema table causes PostgREST to return 403 because it cannot resolve the cross-schema ownership chain for the calling role.
- Grant `SELECT` (and `INSERT` where needed) on the views to the `authenticated` role.
- Grant `USAGE, SELECT` on any sequences used by insertable tables to `authenticated`.
- Grant `INSERT` on the underlying `parts_matcher` table directly to `authenticated` (required for the insert chain to complete through the view).

**Key rules for wrapper functions:**
- Declare as `SECURITY DEFINER` and set `search_path = parts_matcher, public`.
- The return type signature must exactly match the underlying function — inspect with `SELECT pg_get_function_result('schema.fn(args)'::regprocedure)` before writing the wrapper.
- Grant `EXECUTE` on the `public` wrapper to `authenticated`.

### Calling the Match Engine

```javascript
// Correct: call the public wrapper directly on the root client
const { data: matches, error } = await sbClient
  .rpc('run_match', { p_request_id: requestId });
```

> **Note:** `.schema().rpc()` chaining is **not supported** in Supabase JS v2 for RPC calls. The `.schema()` method only works for table queries. Always call `.rpc()` directly on the client and expose the function through a `public` wrapper.

### Page Structure
The frontend is organized as a **single-page app** (`index.html`) with multiple named views toggled via CSS classes.

| View ID | Purpose |
|---|---|
| `#view-login` | Email/password login form |
| `#view-selector` | Product category + type dropdowns; sales rep starting point |
| `#view-request` | Dynamic spec entry form drawn from `quote_template_fields` |
| `#view-results` | Ranked match results from `run_match` |
| `#view-admin` | Admin panel — reference and catalog data management (admin only) |

Supporting files:

| File | Purpose |
|---|---|
| `css/styles.css` | All styles |
| `js/config.js` | Supabase client initialization |
| `js/auth.js` | `signIn()`, `signOut()`, `getSession()` helpers |
| `js/selector.js` | Category → product type cascade loader |
| `js/request.js` | Template loader, dynamic form renderer, insert + RPC call |
| `js/results.js` | Ranked results table renderer |
| `js/app.js` | View routing, session restore on load, login/logout handlers |

---

## Milestone Structure Reference

Every milestone in `docs/progress-tracker.md` follows this structure:

```markdown
## Milestone N — [Name]
**Status:** [✅ Complete | 🔲 Not Started | 🔄 In Progress]
**Date:** [YYYY-MM-DD when started or completed]

### Prior Work
What was already in place before this milestone began. 
References the previous milestone or initial state.

### Dependencies
What must exist, be confirmed, or be decided before work on 
this milestone can begin. Specific — not generic.

### Work Completed
Detailed record of every action taken during this milestone.
Written as it happens, not reconstructed afterward.

### Errors & Fixes
Specific problems encountered and exactly how they were resolved.
Includes tool errors, schema conflicts, logic issues, etc.
If none: write "None encountered."

### Next Steps → Milestone N+1
The defined handoff point. Specific enough that a new developer 
can pick up without asking questions.
```

---

## Actual Milestone Timing — Session 1 (2026-05-11)

This section documents the actual time taken for each milestone during the first full development session. All times are derived from Git commit timestamps (UTC). Use these as planning benchmarks for similar projects.

### Session Overview

| Milestone | Start (UTC) | End (UTC) | Elapsed | Complexity |
|---|---|---|---|---|
| 0 — Project Initialization | 14:22 | 14:36 | ~14 min | Low |
| 1 — Database Schema Creation | 14:36 | 15:38 | ~62 min | Medium |
| 2 — Seed Data & Catalog Entry | 15:38 | 19:10 | ~212 min | High |
| 3 — Quote Template Builder | 19:10 | 19:25 | ~15 min | Low |
| 4 — Match Query Engine | 19:25 | 19:43 | ~18 min | Medium |
| 5 — Frontend Interface | 19:43 | 20:49 | ~66 min | High |
| **Total** | | | **~387 min (~6.5 hrs)** | |

> Times reflect Perplexity AI-assisted development including tool calls, iteration, and error correction. Human review and approval time is excluded since it varies per user.

---

### Milestone 0 — ~14 minutes
**What happened:** Setup prompt written, repo created, full doc suite generated and pushed in one commit.

**Failure points:** None. Milestone 0 is documentation-only and reliably fast.

**Benchmark guidance:** Budget 10–20 minutes. Longer if the initial prompt is vague and requires clarification iterations.

---

### Milestone 1 — ~62 minutes
**What happened:** Schema and all 15 tables created across 3 migrations. RLS applied. Initial seed data inserted.

**Failure points:** None encountered on this project, but common failure patterns to expect:
- **Missing `IF NOT EXISTS`** on schema creation causes migration failure if run twice — always include it
- **Constraint naming collisions** if re-running a migration that already partially applied — use `DROP ... IF EXISTS` before `CREATE`
- **RLS enabled but no policies** — the security advisor will catch this; always run it after migration

**Benchmark guidance:** Budget 45–90 minutes depending on table count. More tables with complex foreign key graphs take longer to validate.

---

### Milestone 2 — ~212 minutes (~3.5 hours)
**What happened:** 203 brands scraped and seeded, 38 product types added, 228 spec definitions created, 3 placeholder catalog items with 24 specs inserted, vendor priority seeded.

This was the longest milestone by far — almost entirely due to data volume and one schema fix.

**Failure points:**

1. **`vendor_item_priority` missing `brand_id` — ~20 min lost**
   - Original schema had unique constraint on `(vendor_id, product_type_id)` which didn’t support brand-level differentiation with a single vendor
   - Two rows were inserted before the issue was discovered
   - **Fix:** Migration to add `brand_id`, update constraint, delete orphaned rows
   - **Prevention:** When designing priority/ranking tables, always ask “what’s the most granular level this needs to work at?” before inserting data

2. **Brand deduplication — ~15 min**
   - Source brand list from easternia.com had trademark symbols and minor formatting inconsistencies
   - **Fix:** Strip symbols, normalize before insert, use `ON CONFLICT DO NOTHING`
   - **Prevention:** Always normalize source data before bulk inserts; use a staging select before inserting to spot duplicates

**Benchmark guidance:** Budget 2–4 hours for a full data seeding milestone. The more product types and spec definitions, the longer it takes. If real catalog data is available in CSV format, use bulk upload to cut this significantly.

---

### Milestone 3 — ~15 minutes
**What happened:** 42 new quote templates and 228 template fields inserted in a single migration by selecting directly from `spec_definitions`.

**Failure points:** None. This was fast because the migration was written as a `INSERT ... SELECT` rather than hand-crafting values.

**Benchmark guidance:** Budget 10–20 minutes. The key insight that kept this short: **drive the insert from existing data rather than generating values manually.**

---

### Milestone 4 — ~18 minutes
**What happened:** `run_match` PostgreSQL function written, tested, and validated end-to-end.

**Failure points:**

1. **Ambiguous column reference — ~5 min**
   - `RETURNS TABLE` column names collided with query result column names inside the function body
   - **Fix:** Prefix all return columns with `out_` (e.g., `out_brand`, `out_match_score`)
   - **Prevention:** Always use a distinctive prefix (`out_`, `p_` for parameters) in PostgreSQL functions to avoid ambiguity

2. **Cannot change return type of existing function — ~3 min**
   - PostgreSQL does not allow `CREATE OR REPLACE FUNCTION` to change the return type
   - **Fix:** `DROP FUNCTION IF EXISTS` before `CREATE FUNCTION` when the signature changes
   - **Prevention:** Include the drop in any migration that modifies function signatures

**Benchmark guidance:** Budget 15–30 minutes for a scoring/matching function of this complexity. More complex scoring logic (weighted fields, multi-pass matching) will take longer.

---

### Milestone 5 — ~66 minutes
**What happened:** Full 4-view SPA built and deployed on GitHub Pages. Validated end-to-end in production.

This milestone had the most failure points — all Supabase-specific — which extended it beyond what the code complexity alone would require.

**Failure points:**

1. **CDN global name collision — ~5 min**
   - `const supabase` in `config.js` shadowed the `supabase` global exposed by the jsdelivr bundle, causing a runtime error
   - **Fix:** Renamed to `sbClient`
   - **Prevention:** Never name your Supabase client variable `supabase`. Use `sbClient` or a project-prefixed name.

2. **Stale anon key — ~3 min**
   - `config.js` was scaffolded with a placeholder key that was never updated, causing `Invalid API key` on every request
   - **Fix:** Fetched current key via MCP and updated `config.js`
   - **Prevention:** Always fetch the live key via MCP at scaffold time rather than using a placeholder

3. **Password reset via SQL — `crypt()` schema path — ~5 min**
   - `crypt()` called without schema qualification; `pgcrypto` lives in the `extensions` schema on Supabase-managed Postgres
   - **Fix:** Use `extensions.crypt()` and `extensions.gen_salt()` explicitly
   - **Prevention:** On Supabase, always qualify extension functions: `extensions.crypt()`, `extensions.gen_salt()`, etc.

4. **`parts_matcher` schema not exposed to PostgREST — ~15 min**
   - `.schema('parts_matcher').from(...)` returned 406, then 404 after failed `ALTER ROLE` attempts
   - `ALTER ROLE authenticator SET pgrst.db_schemas` is overridden by Supabase’s managed config on reload and has no permanent effect
   - **Fix:** Created `public.pm_*` views over all `parts_matcher` tables. All JS queries updated to use `pm_*` with no `.schema()` call
   - **Prevention:** On Supabase managed projects, never assume you can expose a custom schema via SQL. Either add it in the Dashboard (**Settings → API → Exposed schemas**) or use the `public` wrapper view pattern documented above.

5. **`security_invoker = true` blocked cross-schema view reads — ~8 min**
   - Views with `security_invoker = true` over `parts_matcher` tables returned 403
   - PostgREST cannot resolve the cross-schema ownership chain when the view runs as the calling role rather than the view owner
   - **Fix:** Set `security_invoker = false` on all `pm_*` views
   - **Prevention:** When wrapping non-public schema tables in `public` views, always use `security_invoker = false` (the default). Rely on view-level grants and underlying table RLS for access control.

6. **INSERT permission denied for sequence — ~5 min**
   - INSERT via the `pm_customer_requests` view returned `permission denied for sequence customer_requests_id_seq`
   - The sequence lives in `parts_matcher` and `authenticated` had no USAGE grant on it
   - **Fix:** `GRANT USAGE, SELECT ON SEQUENCE parts_matcher.customer_requests_id_seq TO authenticated` (and same for `request_spec_values_id_seq`). Also granted `INSERT` directly on the underlying tables.
   - **Prevention:** When creating insertable `public` views over custom-schema tables with serial/sequence primary keys, always include sequence grants alongside table grants.

7. **`run_match` RPC 404 — ~10 min**
   - `sbClient.rpc('run_match', ...)` returned 404 because PostgREST only serves functions from `public` by default
   - **Fix:** Created `public.run_match(p_request_id integer)` as a `SECURITY DEFINER` SQL wrapper calling `parts_matcher.run_match`
   - Wrapper return type must exactly match the underlying function — first attempt failed because assumed column names differed from actual. Inspected with `pg_get_function_result()` before the second attempt succeeded.
   - **Prevention:** For any function in a non-public schema, create a `public` wrapper at the same time as the function. Don’t wait until the frontend hits a 404 to discover this.

8. **Wrong column names in `results.js` — ~5 min**
   - `results.js` used `out_brand_name` and `out_miss_notes`; actual return columns were `out_brand` and `out_match_notes`
   - **Fix:** Updated column references to match `pg_get_function_result()` output
   - **Prevention:** After writing any function with a `RETURNS TABLE` clause, immediately document the exact column names in the progress tracker. Reference that list when writing the frontend consumer.

**Benchmark guidance:** Budget 45–90 minutes for a 4-view SPA connecting to a custom-schema Supabase backend. The Supabase schema exposure issues account for ~40 minutes of the 66 total — if you follow the wrapper view pattern from the start, this milestone compresses to ~25–30 minutes.

---

## Why This Works

- **Perplexity** maintains project context across sessions within a Space, reducing re-explanation overhead
- **MCP integrations** allow Perplexity to act directly on Supabase and GitHub — no copy-paste, no manual steps
- **Documentation-first** approach means the project is always in a legible, transferable state
- **The progress tracker** functions as a technical changelog and onboarding document simultaneously
- **Milestone structure** enforces dependency awareness and prevents skipped steps

---

## Reusing This Process for a New Project

1. Open Perplexity and create a new Space named for the project
2. Confirm Supabase and GitHub MCP connections are active
3. Write a setup prompt using the four sections above
4. Review the generated documentation before proceeding to schema creation
5. Proceed milestone by milestone, updating `progress-tracker.md` as each one completes
6. For any custom-schema project: create `public` wrapper views and functions **at the time the schema objects are created**, not when the frontend first hits a 404
