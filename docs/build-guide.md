# Parts Spec Matcher — Developer Training Guide

A Living Textbook for Operations Code Writers, Managers, and Contributors

---

> **How to use this guide:** This is not a reference document to skim once and shelve. It is a school you return to. Each part introduces concepts at ground level, then builds on them. Hands-on exercises are embedded throughout — look for the 🧪 **Try It** sections. When something in the codebase changes, this guide changes too.

---

## Part I — The World You're Working In

### Chapter 1: What Is the Parts Spec Matcher?

The Parts Spec Matcher is an internal sales tool built for an industrial machine parts distributor. When a customer needs a part, a sales representative uses this app to look up what specifications are needed, enter the customer's values, and get ranked matches from the product catalog — in seconds, instead of hunting through multiple brand catalogs by hand.

The three platforms this system lives on:

| Platform | Role |
|---|---|
| **GitHub** | Source control — all code, documentation, and migrations live here (`andredavisme/parts-spec-matcher`) |
| **Supabase** | Backend — PostgreSQL database, authentication, RLS, and API layer |
| **GitHub Pages** | Frontend — the browser-based app sales reps actually use |

Everything the app does eventually touches all three. A spec definition lives in the database. The form that collects it lives on GitHub Pages. The migration that created its table lives in the repo.

---

🧪 **Try It 1.1 — Orient Yourself**

Without clicking anything yet, answer these questions in writing:

1. If you wanted to change the label on a spec field, which platform's code would you edit?
2. If you wanted to add a new product type, which platform would you work in first?
3. If a sales rep can't log in, which platform handles authentication?

Check your answers against the table in Chapter 1. If any were wrong, re-read before moving on.

---

## Part II — Git and GitHub

### Chapter 2: Why Version Control Exists

Imagine saving a file as `app_final.js`, then `app_final_v2.js`, then `app_ACTUAL_FINAL.js`. Now imagine five people doing that to the same codebase. Version control solves this. Every change is tracked. Every person's work is isolated until it's ready to merge. Every mistake can be undone.

Git is the tool. GitHub is the platform that hosts it and makes it collaborative.

The core concept: a **repository (repo)** is a folder that Git watches. Every time you save a meaningful change, you create a **commit** — a snapshot of the code at that moment, with a message explaining what changed and why.

### Chapter 3: The Repo Structure

```
parts-spec-matcher/
├── README.md                  ← What this project is and how to use it
├── docs/
│   ├── build-guide.md         ← This document
│   ├── progress-tracker.md    ← Living milestone log
│   ├── product-objective.md   ← Business problem and scope
│   ├── data-architecture.md   ← Schema design and data rules
│   └── quote-workflow.md      ← End-to-end workflow walkthrough
└── (migrations live in Supabase — tracked via apply_migration)
```

The `gh-pages` branch holds the frontend:

```
gh-pages branch/
├── index.html                 ← Single-page app (all views)
├── css/styles.css
└── js/
    ├── app.js                 ← View routing, session, login/logout, admin gate
    ├── config.js              ← Supabase client initialization
    ├── auth.js                ← Sign in / sign out helpers
    ├── selector.js            ← Product type cascade loader
    ├── request.js             ← Template loader, dynamic form, match trigger
    ├── results.js             ← Ranked results table renderer
    ├── admin-vendors.js
    ├── admin-brands.js
    ├── admin-product-types.js
    ├── admin-priority.js
    ├── admin-catalog.js
    ├── admin-specs.js
    └── admin-upload.js
```

### Chapter 4: The Commit Workflow

Every change to the codebase follows this pattern:

1. **Branch** — create a separate working copy so your changes don't affect `main` yet
2. **Edit** — make your changes
3. **Commit** — save a snapshot with a clear message
4. **Push** — upload your branch to GitHub
5. **Pull Request (PR)** — ask for your changes to be reviewed and merged
6. **Merge** — after approval, the changes become part of the official codebase

Commit message format used on this project:

```
<type>: <short description>

Types:
  feat      — new feature or capability
  fix       — bug fix
  docs      — documentation only
  schema    — database migration or schema change
  chore     — maintenance, dependency updates
  refactor  — code restructuring without behavior change
```

Examples of **good** commit messages:

```
feat: add CSV bulk upload for catalog items
schema: add brand_id to vendor_item_priority table
fix: correct security_invoker on pm_* wrapper views
docs: update training guide with Chapter 4 commit workflow
```

Examples of **bad** commit messages:

```
update
fix stuff
changes
wip
```

A commit message is a letter to the future person who needs to understand what happened here. That person is often you, six months from now.

---

🧪 **Try It 2.1 — Read a Commit History**

Go to [`andredavisme/parts-spec-matcher`](https://github.com/andredavisme/parts-spec-matcher) on GitHub. Click the **Commits** tab. Read the last 10 commit messages.

Ask yourself:
- Can you tell what changed in each commit without opening the diff?
- Are any messages vague? What would you have written instead?
- Which commits touch the database vs. the frontend UI?

---

🧪 **Try It 2.2 — Your First Branch and Commit**

1. Create a branch called `training/your-name-notes`
2. Add a file called `docs/notes/your-name.md`
3. Write three things you learned from Chapters 1–3 in your own words
4. Commit with the message: `docs: add personal notes from training part 1`
5. Open a Pull Request — **do NOT merge it yet**

This is practice. The PR will be reviewed as a checkpoint.

---

## Part III — The Database

### Chapter 5: What Is a Relational Database?

A database is an organized collection of data. A **relational database** organizes that data into **tables** — like spreadsheets — where each table stores one kind of thing, and tables relate to each other through shared IDs.

This project's database is **PostgreSQL**, hosted on Supabase. All spec definitions, catalog items, vendor data, and customer requests live here.

A table looks like this:

```
vendors
┌────┬──────────────────────────────┬───────────────────────────┬───────────┐
│ id │ name                         │ contact_email             │ is_active │
├────┼──────────────────────────────┼───────────────────────────┼───────────┤
│  1 │ Eastern Industrial Automation│ sales@easternia.com       │ true      │
└────┴──────────────────────────────┴───────────────────────────┴───────────┘
```

Each row is one vendor. The `id` column is the **primary key** — a unique number that identifies this row across the entire database.

### Chapter 6: SQL — The Language of Databases

SQL (Structured Query Language) is how you talk to a relational database.

The four most common operations:

```sql
-- Read data
SELECT name, is_active FROM parts_matcher.brands WHERE is_active = true;

-- Add data
INSERT INTO parts_matcher.vendors (name, is_active)
VALUES ('New Distributor Co', true);

-- Update data
UPDATE parts_matcher.vendors SET contact_email = 'info@example.com' WHERE id = 1;

-- Remove data (use is_active = false instead where possible — see Chapter 7)
DELETE FROM parts_matcher.vendors WHERE id = 99;
```

The **JOIN** — connecting two tables:

If you want to see all catalog items and the brand name they belong to:

```sql
SELECT
  ci.part_number,
  ci.description,
  b.name AS brand_name
FROM parts_matcher.catalog_items ci
JOIN parts_matcher.brands b ON ci.brand_id = b.id
WHERE ci.is_active = true;
```

This works because `catalog_items.brand_id` stores the `id` from the `brands` table. That link is called a **foreign key**.

### Chapter 7: The `parts_matcher` Schema

All tables for this project live in the `parts_matcher` schema — a named namespace inside the shared Supabase PostgreSQL instance, kept separate from other projects.

**Reference / Lookup Tables** (controlled vocabulary — admin-only writes)

```sql
spec_units           -- inches, mm, lbs, RPM, etc.
product_categories   -- Bearings, Chain & Sprockets, etc.
product_types        -- Deep Groove Ball Bearing, Roller Chain, etc.
vendors              -- Eastern Industrial Automation, etc.
brands               -- SKF, Dodge, Browning, etc.
spec_definitions     -- What fields belong to each product type (match_type: exact/range/nearest)
```

**Catalog Tables** (the inventory data)

```sql
source_documents     -- Where catalog data came from (brand PDF, manual entry, etc.)
catalog_items        -- Individual parts: brand, part number, description
catalog_item_specs   -- Spec values for each item (value_numeric or value_text)
vendor_item_priority -- Which vendor/brand to prefer when multiple options match
```

**Workflow Tables** (live sales transactions)

```sql
quote_templates       -- One template per product type
quote_template_fields -- Which spec fields appear on each template
customer_requests     -- A customer's inquiry (product type + rep info)
request_spec_values   -- The spec values the customer provided
match_results         -- The ranked catalog matches returned by run_match()
```

> **Soft Deletes:** Reference and catalog tables use an `is_active boolean` flag rather than hard deletes. This preserves referential integrity — a brand that's been used on a catalog item can never be truly deleted without breaking those records. Set `is_active = false` to retire it.

---

🧪 **Try It 3.1 — Explore the Schema**

Open the Supabase SQL Editor for this project. Run each of these one at a time. Read the result before running the next.

```sql
-- 1. What tables exist in parts_matcher?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'parts_matcher'
ORDER BY table_name;

-- 2. What does spec_definitions look like?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'parts_matcher'
  AND table_name = 'spec_definitions'
ORDER BY ordinal_position;

-- 3. How many spec definitions exist per product type?
SELECT pt.name AS product_type, COUNT(sd.id) AS spec_count
FROM parts_matcher.spec_definitions sd
JOIN parts_matcher.product_types pt ON sd.product_type_id = pt.id
WHERE sd.is_active = true
GROUP BY pt.name
ORDER BY spec_count DESC;
```

You are not changing anything — this is read-only exploration.

---

🧪 **Try It 3.2 — Write a Join**

Write a query that answers: *"Show me all active catalog items, their part number, and the name of the brand they belong to."*

Start with this skeleton and fill in the blanks:

```sql
SELECT
  ci.______,
  ci.description,
  b.______ AS brand_name
FROM parts_matcher.catalog_items ci
JOIN _______ b ON ci._______ = b.id
WHERE ci.is_active = true;
```

A correct query on a small table returns a short list without error.

---

### Chapter 8: Migrations — How the Schema Changes Over Time

You never change a production database by hand. Every structural change — adding a table, adding a column, changing a constraint — is applied as a **migration** via Supabase's `apply_migration` tool, which records it by name in `supabase_migrations.schema_migrations`.

Naming convention used on this project:

```
parts_matcher_<description_in_snake_case>

Examples:
  parts_matcher_get_role_helper
  parts_matcher_role_based_rls
  parts_matcher_quote_templates_all_product_types
```

A migration looks like this:

```sql
-- Migration: parts_matcher_add_notes_to_vendors
-- Purpose: Add an optional notes field to the vendors table

ALTER TABLE parts_matcher.vendors
ADD COLUMN IF NOT EXISTS notes TEXT;
```

**The rule:** Once a migration is applied to production, it is never edited. If something needs to change, you write a new migration that makes that change. The history must always be accurate.

**Separation of concerns:** DDL (table structure) is always a separate migration from RLS policies. This makes it easier to re-apply or audit security changes independently.

---

🧪 **Try It 3.3 — Write a Migration**

Write a migration that adds a `phone` column (type: `TEXT`, nullable) to `parts_matcher.vendors`.

Include:
- A comment at the top explaining what it does and why
- `IF NOT EXISTS` so it's safe to re-run

Run it in the **Supabase SQL Editor** to confirm it works without error. Do **not** apply it to production without review.

---

## Part IV — Security and Access Control

### Chapter 9: Row-Level Security (RLS)

In most databases, access to a table means access to all rows. Supabase's **Row-Level Security (RLS)** goes further: even within a table, each user can only see and edit the rows they are permitted to — enforced by policies written in SQL.

This project uses **JWT `app_metadata` claims** for role-based access. Each user carries a single `parts_matcher_role` string claim in their token.

| Claim Value | Role | Access |
|---|---|---|
| `app_maintenance` | App Maintenance | Full admin / DBA tooling; read-only on workflow tables |
| `inside_sales` | Inside Sales Rep | Run quote workflow; view own requests and results |
| `outside_sales` | Outside Sales Rep | Same as inside_sales |
| `branch_manager` | Branch Manager | Same as sales; branch-wide visibility (deferred) |

**Three helper functions** live in `parts_matcher` and are used by all RLS policies:

```sql
-- Returns the role claim from the user's JWT
parts_matcher.get_role()   → text

-- Returns true for app_maintenance users
parts_matcher.is_admin()   → boolean

-- Returns true for inside_sales, outside_sales, branch_manager
parts_matcher.is_sales()   → boolean
```

An example policy using these helpers:

```sql
-- Only sales reps can insert customer requests
CREATE POLICY "sales insert customer_requests"
ON parts_matcher.customer_requests
FOR INSERT
WITH CHECK (parts_matcher.is_sales());

-- app_maintenance can read all requests (but not insert)
CREATE POLICY "admin read customer_requests"
ON parts_matcher.customer_requests
FOR SELECT
USING (parts_matcher.is_admin());
```

**The rule:** RLS must be enabled on every table. A table with RLS enabled but no policies denies all access. Always run the security advisor after adding a new table.

### Chapter 10: The Frontend Role Gate

The frontend also checks the role claim to show or hide admin buttons. This is a UI convenience — the database RLS is the real enforcement layer.

```javascript
// js/app.js
function maybeShowAdminBtns(session) {
  const meta = session && session.user && session.user.app_metadata;
  const isAdmin = meta && meta.parts_matcher_role === 'app_maintenance';
  ['admin-vendors-btn', 'admin-brands-btn', 'admin-pt-btn',
   'admin-priority-btn', 'admin-catalog-btn', 'admin-specs-btn',
   'admin-upload-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('hidden', !isAdmin);
  });
}
```

**Important:** Never rely solely on frontend gating for security. A determined user can bypass the UI. RLS is what actually protects the data.

### Chapter 11: Granting a Role

To assign a role to a user:

**Option A — Supabase Dashboard:**
1. Go to **Authentication → Users**
2. Select the user
3. Edit **App Metadata** and add: `{ "parts_matcher_role": "inside_sales" }`
4. The user must sign out and back in for the new JWT claim to take effect

**Option B — SQL:**

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"parts_matcher_role": "inside_sales"}'
WHERE email = 'user@example.com';
```

---

🧪 **Try It 4.1 — Review the RLS Policies**

In the Supabase dashboard, go to **Authentication → Policies**. Find the `parts_matcher` schema tables.

For each workflow table (`customer_requests`, `request_spec_values`, `match_results`), answer:
- Is RLS enabled?
- What policies exist?
- Which roles can SELECT? Which can INSERT?

Write your findings in your personal notes file.

---

🧪 **Try It 4.2 — The Role Cutover Drill**

This is a thought exercise based on a real issue that occurred during Milestone 8:

The `is_admin()` helper was updated from checking `'admin'` to checking `'app_maintenance'`. This immediately broke admin access for any user whose JWT still carried the old `'admin'` claim.

Walk through:
1. How would you detect this problem if you didn't know the cause?
2. What SQL would you run to check which users still have the old claim?
3. What's the fix — and why must the user sign out and back in?

Write your answer as a three-step checklist in your notes file.

---

## Part V — The Full Stack

### Chapter 12: How the Frontend Talks to Supabase

The frontend is a **static HTML/CSS/JS single-page app** hosted on the `gh-pages` branch of this repo and served by GitHub Pages. It connects to Supabase using the Supabase JavaScript client library loaded from CDN — no build pipeline, no framework, no npm.

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/config.js"></script>
```

```javascript
// js/config.js
// IMPORTANT: do NOT name this variable "supabase" — it collides with the CDN global.
const sbClient = window.supabase.createClient(
  'https://hhyhulqngdkwsxhymmcd.supabase.co',
  'YOUR_PUBLISHABLE_KEY'
);
```

The **publishable (anon) key** is safe to commit to the `gh-pages` branch. It is not a secret — it can only do what RLS policies allow. The **service role key** is secret and must never appear in frontend code.

Common query patterns:

```javascript
// SELECT with filter
const { data, error } = await sbClient
  .from('pm_brands')       // Always use the pm_* public wrapper views, not parts_matcher tables directly
  .select('id, name')
  .eq('is_active', true);

// INSERT
const { data } = await sbClient
  .from('pm_customer_requests')
  .insert({ product_type_id: 1, customer_name: 'Acme Co' })
  .select();

// Call a database function (RPC)
const { data: matches } = await sbClient
  .rpc('run_match', { p_request_id: requestId });
```

### Chapter 13: The Public Wrapper Pattern

Supabase PostgREST only exposes the `public` schema by default. Since all our tables live in `parts_matcher`, they are accessible to the frontend through **`public.pm_*` wrapper views** — one view per table.

```sql
-- Example wrapper view
CREATE OR REPLACE VIEW public.pm_brands
WITH (security_invoker = false)  -- Must be false for cross-schema views
AS SELECT * FROM parts_matcher.brands;

GRANT SELECT ON public.pm_brands TO authenticated;
```

Key rules:
- Always use `security_invoker = false` on wrapper views (setting it to `true` causes 403 errors)
- Grant `SELECT` on the view to `authenticated`
- For insertable tables, also grant `INSERT` on the underlying table and `USAGE, SELECT` on any sequences
- For RPC functions, create a `public` wrapper using `SECURITY DEFINER`

This is why you always call `.from('pm_brands')` in JavaScript, never `.schema('parts_matcher').from('brands')`.

### Chapter 14: The Match Engine

The heart of the app is the `parts_matcher.run_match(p_request_id integer)` PostgreSQL function. It:

1. Reads the customer's spec values from `request_spec_values`
2. Compares them against every active catalog item of the same product type
3. Scores each catalog item using these rules:
   - `exact` match type → `1.0` if equal, `0.0` if not
   - `range` match type → `1.0` if `customer_value ≤ catalog_value`, else `0.0`
   - `nearest` match type → `1.0 / (1.0 + |customer_value − catalog_value|)`
4. Final score = `(sum of field scores / total supplied fields) × 100`
5. Secondary sort by `vendor_item_priority.priority_rank` ASC
6. Inserts results into `match_results` and returns them

The function is called from JavaScript via:

```javascript
const { data: matches } = await sbClient.rpc('run_match', { p_request_id: id });
```

> **Note:** `.schema().rpc()` chaining is not supported in Supabase JS v2. Always call `.rpc()` directly on the client — which is why `public.run_match` exists as a wrapper.

---

🧪 **Try It 5.1 — Trace a Feature End to End**

Pick the feature: *"A sales rep selects Conveyor Roller, fills in the spec form, and sees match results."*

Trace all five layers and write one sentence for each:

1. **GitHub** — which file and branch contains the form rendering code?
2. **Frontend** — what Supabase query submits the customer's spec values?
3. **RLS** — what policy controls whether that insert is allowed?
4. **Database** — what tables are written to, and in what order?
5. **Migration** — which migration created the `customer_requests` table?

Write this as a five-step trace in your notes file. You will find it invaluable for debugging.

---

## Part VI — Standards and Practices

### Chapter 15: The Setup Prompt Pattern

This project was initialized using a structured four-part setup prompt to an AI assistant (Perplexity with Supabase and GitHub MCP integrations). Understanding this pattern lets you replicate it for new projects.

**Section 1 — The Idea:** Plain-language description of the business, the problem, and what the app will do. Include any relevant URLs.

**Section 2 — The User Story:** Walk through the core workflow from a real user's perspective. Name the role, the trigger, each action, and the outcome.

**Section 3 — Repo & Supabase Targets:** Tell the AI exactly where to build — repo name, visibility, Supabase project, schema name.

**Section 4 — Progress Update Document:** Request a living milestone tracker in the repo, with the structure defined so handoffs work cleanly.

From a well-formed prompt, the AI produces a full documentation suite (`README.md`, `product-objective.md`, `data-architecture.md`, `quote-workflow.md`, `progress-tracker.md`) and begins milestone work immediately.

### Chapter 16: When Something Breaks

Breaking things is part of building things. The response matters more than the mistake.

**The incident response pattern:**

1. **Stop the bleeding** — revert the change, roll back the migration, or disable the feature if it's causing active harm
2. **Understand what happened** — read logs in Supabase, read the git diff, reproduce the error
3. **Fix forward** — write a new migration or a new commit that corrects the issue
4. **Document it** — add a brief entry to `progress-tracker.md` in the relevant milestone's Errors & Fixes section

Supabase logs are your best friend. The dashboard has logs for the API, the database, edge functions, and auth. When something fails silently, check logs first.

### Chapter 17: When an AI Thread Fails — How to Recover

If the AI assistant gets stuck or a tool call fails mid-task, **the fastest recovery is to delete the thread and start a new one.** All meaningful progress is already committed to the repo. The thread is disposable — the repo is the source of truth.

**Recovery steps:**

1. Before deleting the thread — copy the last substantive AI response to a text file
2. Delete the current thread
3. Start a new thread in the same Space
4. Use this prompt:

```
Pick up where we left off. Review docs/progress-tracker.md to get current on completed
milestones and next steps, then continue from there.

I'm also attaching the last AI response from the failed thread for context:
[paste or attach the saved response here]
```

The AI will read the repo, locate the last completed milestone, and resume without re-explanation.

**Best practice:** Commit and update `progress-tracker.md` at the end of every milestone. Save the last AI response before deleting a thread. Do not try to salvage a broken thread.

---

🧪 **Try It 6.1 — Read the Logs**

In the Supabase dashboard, open **Logs → API**.

Look at the last 20 requests. For each, note:
- The HTTP method (GET, POST, PATCH, DELETE)
- The status code (200 = success, 4xx = client error, 5xx = server error)
- The table or endpoint being accessed

Can you tell which requests came from the frontend app vs. direct SQL editor queries?

---

🧪 **Try It 6.2 — Run the Security Advisor**

In the Supabase dashboard, open the **Security Advisor**.

For each finding in the `parts_matcher` schema:
- What is the issue?
- What is the suggested fix?
- Is this a policy gap, a missing RLS enable, or something else?

Do not apply fixes without understanding them. Document your findings in your notes file.

---

## Appendix A — Known Issues and Lessons Learned

These are real errors encountered during development. Reading them before you encounter them is the next best thing to having experienced them yourself.

| Issue | What Happened | Fix | Prevention |
|---|---|---|---|
| CDN name collision | `const supabase` in `config.js` shadowed the CDN global | Renamed to `sbClient` | Never name the client variable `supabase` |
| Stale anon key | Placeholder key in `config.js` caused `Invalid API key` | Fetched live key via MCP | Always fetch the live key at scaffold time |
| `parts_matcher` not exposed | `.schema('parts_matcher').from(...)` returned 406 | Created `public.pm_*` wrapper views | Use wrapper views from the start, not the schema shortcut |
| `security_invoker = true` | Cross-schema wrapper views returned 403 | Set `security_invoker = false` | Always use `security_invoker = false` on cross-schema wrapper views |
| Sequence permission denied | INSERT via view returned `permission denied for sequence` | Granted `USAGE, SELECT` on sequence to `authenticated` | Include sequence grants when creating insertable wrapper views |
| `run_match` RPC 404 | PostgREST doesn't expose non-public schema functions | Created `public.run_match` wrapper | Create public wrappers for all non-public functions at the same time as the function itself |
| Wrong `RETURNS TABLE` column names | Frontend used `out_brand_name`; actual column was `out_brand` | Updated JS to match actual signature | After writing any function, document exact return column names immediately |
| Role claim cutover | Updating `is_admin()` from `'admin'` to `'app_maintenance'` broke existing sessions | Updated user metadata immediately; users refreshed sessions | Plan claim renames carefully; update all users before deploying the policy change |
| Spec value column mismatch | `admin-catalog.js` wrote to `spec_value` (doesn't exist); actual columns are `value_numeric` / `value_text` | Added `catResolveSpecValue()` and `catSpecDisplayValue()` helpers | Verify column names against schema before writing insert code |

---

## Appendix B — Quick Reference

**SQL Patterns**

```sql
-- Check if RLS is enabled on a table
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'your_table_name';

-- List all policies on a table
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'your_table_name';

-- Check which migrations have been applied
SELECT name, executed_at
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC;

-- See all tables in parts_matcher
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'parts_matcher'
ORDER BY table_name;
```

**Supabase JS Patterns**

```javascript
// SELECT with filter (always use pm_* views)
const { data } = await sbClient
  .from('pm_brands')
  .select('id, name')
  .eq('is_active', true);

// INSERT a row
const { data } = await sbClient
  .from('pm_customer_requests')
  .insert({ product_type_id: 1, customer_name: 'Acme' })
  .select();

// UPDATE a row
const { data } = await sbClient
  .from('pm_vendors')
  .update({ contact_email: 'new@example.com' })
  .eq('id', vendorId);

// Call a function
const { data } = await sbClient
  .rpc('run_match', { p_request_id: requestId });
```

---

## Appendix C — Glossary

| Term | Definition |
|---|---|
| Commit | A saved snapshot of code changes with a message |
| Branch | A separate working copy of the code |
| Pull Request (PR) | A request to merge a branch into main, reviewed before merging |
| Migration | A named SQL operation applied via `apply_migration` that changes the database structure |
| Schema | A named namespace inside a PostgreSQL database that groups tables (`parts_matcher`, `public`) |
| Primary Key | A unique ID column that identifies each row in a table |
| Foreign Key | A column that references the primary key of another table |
| RLS | Row-Level Security — per-row access control enforced by the database |
| Wrapper View | A `public` schema view over a `parts_matcher` table, making it accessible to PostgREST |
| Publishable Key | The safe-to-expose Supabase key used in frontend code |
| Service Role Key | The secret Supabase key that bypasses RLS — never in frontend code |
| JOIN | SQL operation that combines rows from two tables based on a shared column |
| Soft Delete | Setting `is_active = false` instead of deleting a row, to preserve referential integrity |
| app_metadata | The JWT field where Supabase stores user role claims like `parts_matcher_role` |

---

## Appendix D — How This Guide Grows

This guide lives at `docs/build-guide.md` in the `main` branch. It is a living document.

**When to update it:**
- A new system or tool is added → add a chapter
- A standard changes (migration naming, commit format, etc.) → update the relevant chapter
- A new error pattern would help future readers → add it to Appendix A
- Something broke and the team learned from it → add a note in Chapter 16

**How to update it:**
1. Branch from `main`: `git checkout -b docs/update-training-guide`
2. Edit the Markdown file
3. Commit: `docs: update training guide — brief description`
4. Open a PR, get a review, merge

The guide should always reflect how the system actually works. If the code and the guide disagree, the guide is wrong.

---

*Last updated: 2026-05-13 — parts-spec-matcher*
