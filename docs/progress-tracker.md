# Progress Tracker

This document records development milestones in sequence. Each milestone includes prior work context, dependencies required before work can begin, the work completed (including errors encountered and fixes applied), and the defined next steps.

A developer or DBA picking up this project at any point should be able to read this document to understand the current state and continue without needing to reconstruct history.

---

## Milestone 0 — Project Initialization
**Status:** ✅ Complete  
**Date:** 2026-05-11

### Prior Work
None. This is the starting point.

### Dependencies
- GitHub account: `andredavisme`
- Supabase project: `andredavisme's Project` (ID: `hhyhulqngdkwsxhymmcd`, region: us-west-2)
- Confirmed that schema `parts_matcher` will be kept separate from other schemas in the shared Supabase project

### Work Completed
- Created private GitHub repository: [andredavisme/parts-spec-matcher](https://github.com/andredavisme/parts-spec-matcher)
- Defined product categories based on Easternia distributor catalog (easternia.com/products)
- Drafted full initial documentation suite:
  - `README.md` — project overview, user roles, workflow summary, tech stack
  - `docs/product-objective.md` — business problem, scope, success criteria
  - `docs/data-architecture.md` — schema design, entity groups, vendor priority logic, data integrity rules
  - `docs/quote-workflow.md` — end-to-end workflow with conveyor roller as the reference example
  - `docs/progress-tracker.md` — this document

### Errors & Fixes
- Attempted to fetch product category list from `easternia.com/products` — URL fetch failed. Categories were estimated from known distributor context and marked for DBA confirmation during Milestone 2.

### Next Steps → Milestone 1
- Create the `parts_matcher` schema in Supabase
- Apply DDL migrations for all reference/lookup tables
- Apply DDL migrations for catalog and workflow tables
- Run security and performance advisors after schema creation
- Confirm product category list with DBA against actual Easternia catalog

---

## Milestone 1 — Database Schema Creation
**Status:** ✅ Complete  
**Date:** 2026-05-11

### Prior Work
Milestone 0 complete. Documentation in place. Repository initialized.

### Dependencies
- Access to Supabase project `hhyhulqngdkwsxhymmcd`
- DBA review deferred — estimated categories accepted as starting point

### Work Completed

**Migration 1 — Schema + Reference Tables** (`create_parts_matcher_schema_and_reference_tables`)
- Created schema `parts_matcher`
- Created tables: `spec_units`, `product_categories`, `product_types`, `vendors`, `brands`, `spec_definitions`
- All tables include: `is_active` soft-delete flag, `created_at`, `updated_at`, `created_by` audit columns
- `spec_definitions` includes `match_type` CHECK constraint (`exact`, `range`, `nearest`) and optional `tolerance_pct`

**Migration 2 — Catalog Tables** (`create_parts_matcher_catalog_tables`)
- Created tables: `source_documents`, `catalog_items`, `catalog_item_specs`, `vendor_item_priority`

**Migration 3 — Workflow Tables** (`create_parts_matcher_workflow_tables`)
- Created tables: `quote_templates`, `quote_template_fields`, `customer_requests`, `request_spec_values`, `match_results`

**Seed Data** (via `execute_sql`)
- Seeded 12 `spec_units`, 10 `product_categories`, 5 `product_types`, and spec definitions for Conveyor Roller and Deep Groove Ball Bearing

**Migration 4 — RLS + Admin Policies** (`parts_matcher_rls_and_admin_policies`)
- Enabled RLS on all 15 tables; admin write access gated by JWT `app_metadata` claim `parts_matcher_role: admin`
- Created `parts_matcher.is_admin()` helper function
- Security advisor: no findings in `parts_matcher` schema

### Errors & Fixes
None.

---

## Milestone 2 — Seed Data & Catalog Entry
**Status:** ✅ Complete  
**Date:** 2026-05-11

### Prior Work
Milestone 1 complete. All schema tables created, RLS applied, initial reference data seeded.

### Dependencies
- DBA access to Supabase
- Source catalogs for at least one brand per product category
- Vendor relationship list

### Work Completed

**Vendor Seed**
- Inserted 1 vendor: `Eastern Industrial Automation` (ID: 1)

**Brand Seed**
- Inserted 203 brands (IDs 1–203) sourced from easternia.com/brands, all linked to `primary_vendor_id = 1`
- Duplicate entries deduplicated; trademark symbols stripped from names

**Product Types — Full Expansion**
- Added 38 new product types across all 8 previously empty categories (IDs 6–43)
- Final count: 43 product types across 10 categories

| Category | Product Types |
|---|---|
| Conveyor Components | Conveyor Roller, Conveyor Pulley |
| Bearings | Deep Groove Ball Bearing, Tapered Roller Bearing, Pillow Block Bearing |
| Chain & Sprockets | Roller Chain, Engineering Class Chain, Conveyor Chain, Sprocket, Chain Coupling |
| Couplings & Clutches | Jaw Coupling, Grid Coupling, Disc Coupling, Rigid Coupling, Overrunning Clutch, Torque Limiter |
| Gearboxes & Speed Reducers | Worm Gear Reducer, Helical Gear Reducer, Bevel Gear Reducer, Parallel Shaft Reducer, Right Angle Reducer |
| Motors & Drives | AC Induction Motor, DC Motor, Variable Frequency Drive, Gearmotors |
| Linear Motion | Linear Bearing, Linear Actuator, Ball Screw, Linear Guide Rail |
| Seals & Gaskets | Oil Seal, O-Ring, V-Ring Seal, Mechanical Face Seal |
| Fasteners & Hardware | Hex Bolt, Stud, Set Screw, Collar, Retaining Ring |
| Pneumatics & Hydraulics | Pneumatic Cylinder, Hydraulic Cylinder, Solenoid Valve, Pressure Regulator, Hydraulic Pump |

**Spec Definitions — Full Coverage**
- Added spec definitions for all 43 product types (IDs 1–228 total)
- Each product type has 3–8 spec fields with required flags, match types, and units

**Admin & CSV Upload Design**
- Admin CRUD handled via frontend admin screen in Milestone 6
- CSV bulk upload templates to be provided for all reference and catalog tables (see `docs/data-architecture.md`)

**Placeholder Catalog Items — Conveyor Roller**
- Added 1 `source_documents` record (ID: 1): `Placeholder Catalog - Conveyor Roller Test Data` (type: manual)
- Added 3 `catalog_items` for Conveyor Roller (product_type_id: 1):

| ID | Brand | Part Number | Description |
|---|---|---|---|
| 1 | Browning | BRW-CR-190-24-0500 | Steel, 1.9" dia × 24" BF, 1/2" shaft |
| 2 | Dodge | DGE-CR-250-36-0750 | Galvanized, 2.5" dia × 36" BF, 3/4" shaft |
| 3 | Rexnord | RXN-CR-350-48-1000 | Heavy Duty, 3.5" dia × 48" BF, 1" shaft |

- Added 24 `catalog_item_specs` records (8 specs × 3 items): roller_diameter, roller_length, shaft_diameter, load_rating, max_speed, material, bearing_type, finish
- Added 3 `vendor_item_priority` records for Conveyor Roller:
  - Rank 1: Browning (preferred — best margin)
  - Rank 2: Dodge (good availability)
  - Rank 3: Rexnord (heavy duty applications)

### Errors & Fixes

**Schema Fix — `vendor_item_priority` missing `brand_id`**
- Original unique constraint was `(vendor_id, product_type_id)` — only one row per vendor+product type, which made brand-level priority impossible with a single vendor
- **Fix:** Applied migration `vendor_item_priority_add_brand_id`
  - Dropped old unique constraint
  - Added `brand_id integer REFERENCES parts_matcher.brands(id)`
  - Added new unique constraint `(vendor_id, brand_id, product_type_id)`
- Two orphaned rows (IDs 1–2) inserted before fix were left in place with `brand_id = NULL`

**Cleanup — Orphaned `vendor_item_priority` rows**
- Deleted rows where `brand_id IS NULL` via `execute_sql`
- Confirmed: 3 clean priority rows remain (Browning rank 1, Dodge rank 2, Rexnord rank 3) all with valid `brand_id` values

### Next Steps → Milestone 3
- Replace placeholder catalog items with real part data from brand catalogs
- Run the end-to-end match workflow manually to validate before building the query engine
- Begin Milestone 3: Quote Template Builder

---

## Milestone 3 — Quote Template Builder
**Status:** ✅ Complete  
**Date:** 2026-05-11

### Prior Work
Milestone 2 complete. Reference data seeded, placeholder catalog items in place for Conveyor Roller. Orphaned `vendor_item_priority` rows cleaned up.

### Dependencies
- `spec_definitions` and `spec_units` populated for all 43 product types ✅
- `quote_templates` and `quote_template_fields` tables created ✅

### Work Completed

**Conveyor Roller Template (pre-existing)**
- 1 `quote_templates` record (ID: 1, product_type_id: 1, version: 1) was already in place from earlier work
- 8 `quote_template_fields` already linked to all Conveyor Roller spec definitions in correct sort order

**Migration — All Remaining Product Types** (`parts_matcher_quote_templates_all_product_types`)
- Inserted 42 new `quote_templates` records (IDs 2–43), one per remaining active product type
- Populated `quote_template_fields` for all 42 new templates by selecting directly from `spec_definitions` where `product_type_id` matches
- Fields inherit `sort_order` and `is_required` from their corresponding `spec_definitions` rows
- `display_hint` left NULL — to be populated by DBA or admin UI in Milestone 6

**Final Counts**
- `quote_templates`: 43 (one per product type)
- `quote_template_fields`: 228 (matches total active spec definitions exactly)

### Errors & Fixes
None encountered.

### Next Steps → Milestone 4
- Build the `parts_matcher.run_match(p_request_id integer)` PostgreSQL function as a Supabase RPC
- Test against 3 Conveyor Roller catalog items to validate match logic end-to-end

---

## Milestone 4 — Match Query Engine
**Status:** ✅ Complete  
**Date:** 2026-05-11

### Prior Work
Milestone 3 complete. Quote templates built for all 43 product types. Fields match spec definitions exactly.

### Dependencies
- Catalog items with complete spec values for at least one product type ✅ (3 Conveyor Roller items)
- Vendor priority data entered for at least one product type ✅
- Defined tolerance / matching rules per spec field type ✅

### Work Completed

**Test Customer Request**
- Inserted 1 `customer_requests` record (ID: 1): product_type_id=1, template_id=1, customer_name="Test Customer", ref="TEST-001"
- Inserted 8 `request_spec_values` covering all Conveyor Roller spec fields

**Scoring Logic**
- `exact` → 1.0 if match, 0.0 if not (case-insensitive for text)
- `nearest` → `1.0 / (1.0 + abs(customer_value - catalog_value))` — smooth proximity, always > 0
- `range` → 1.0 if `customer_value <= catalog_value`, else 0.0
- Final score = `(sum of field scores / total customer-supplied fields) * 100`, rounded 2dp
- Secondary sort: `vendor_item_priority.priority_rank` ASC

**Test Results — `SELECT * FROM parts_matcher.run_match(1)`**

| Rank | Brand | Part Number | Score | Vendor Priority |
|---|---|---|---|---|
| 1 | Dodge | DGE-CR-250-36-0750 | 90.53 | 2 |
| 2 | Browning | BRW-CR-190-24-0500 | 46.97 | 1 |
| 3 | Rexnord | RXN-CR-350-48-1000 | 31.79 | 3 |

- Dodge ranks #1 despite vendor priority rank 2 — confirms score overrides vendor rank ✅
- Results written to `match_results`; re-running is idempotent ✅

### Errors & Fixes

**Ambiguous column reference in RETURNS TABLE**
- Fix: prefixed all RETURNS TABLE column names with `out_` and CTE aliases with short disambiguating prefixes

**Cannot change return type of existing function**
- Fix: `DROP FUNCTION IF EXISTS` before `CREATE FUNCTION` in same migration

### Next Steps → Milestone 5
- Scaffold frontend (static HTML/JS + Supabase JS client)
- Implement product type selector, request form, and match results view

---

## Milestone 5 — Frontend Interface
**Status:** ✅ Complete  
**Date:** 2026-05-12

### Prior Work
Milestone 4 complete. Match engine functional and validated end-to-end.

### Dependencies
- Supabase publishable key for client queries
- Static hosting via GitHub Pages (gh-pages branch)

### Work Completed

- Deployed static frontend to GitHub Pages (`gh-pages` branch)
- `index.html` — single-page app shell with tab-based navigation
- `js/app.js` — auth state management, session handling, role-based UI gating via `parts_matcher_role` JWT claim
- `js/auth.js` — Supabase auth helpers (sign in / sign out)
- `js/config.js` — Supabase project URL and publishable key
- `js/selector.js` — product type dropdown, loads from `product_types` table
- `js/request.js` — spec entry form, dynamically renders fields from `quote_template_fields`; submits to `customer_requests` + `request_spec_values`, then calls `run_match` RPC
- `js/results.js` — renders ranked match results from `match_results` table
- `css/` — base styles

### Errors & Fixes
None recorded.

### Next Steps → Milestone 6
- Build admin screens for catalog and reference data management

---

## Milestone 6 — Admin / DBA Tooling
**Status:** ✅ Complete  
**Date:** 2026-05-12

### Prior Work
Milestone 5 complete. Sales rep interface functional on GitHub Pages.

### Dependencies
- `app_maintenance` JWT claim for admin role gating
- All reference and catalog tables accessible via Supabase JS client

### Work Completed

- `js/admin-brands.js` — CRUD for `brands` table
- `js/admin-catalog.js` — CRUD for `catalog_items` and `catalog_item_specs`
- `js/admin-priority.js` — manage `vendor_item_priority` rankings
- `js/admin-product-types.js` — CRUD for `product_types`
- `js/admin-specs.js` — CRUD for `spec_definitions` and `spec_units`
- `js/admin-upload.js` — CSV bulk upload for catalog items and specs
- `js/admin-vendors.js` — CRUD for `vendors`
- All admin tabs hidden for non-`app_maintenance` users via `maybeShowAdminBtns()` in `app.js`

### Errors & Fixes
None recorded.

### Next Steps → Milestone 7
- Run security advisor against full schema
- Address any RLS gaps or function security warnings surfaced

---

## Milestone 7 — Security Hardening (Round 1)
**Status:** ✅ Complete  
**Date:** 2026-05-12

### Prior Work
Milestone 6 complete. Admin tooling in place. Full schema active.

### Dependencies
- Supabase security advisor access
- All schemas populated with tables, functions, and RLS policies

### Work Completed

**Security Advisor Findings — Addressed**

- `client_lawnscaping` tables (`consult_requests`, `customers`, `locations`, `quotes`) — RLS was enabled at policy-definition time but `ENABLE ROW LEVEL SECURITY` was never applied to the tables themselves; policies were silently doing nothing. Fixed via migration `enable_rls_client_lawnscaping`.
- `public.run_match` accessible by `anon` role — revoked via migration `revoke_anon_run_match_and_fix_search_path`. Only `authenticated` can now call the match API.
- `parts_matcher.run_match` had mutable `search_path` — fixed in same migration as above (DROP + CREATE with `SET search_path = parts_matcher, public`).

### Errors & Fixes
None beyond those addressed above.

### Next Steps → Milestone 8
- Implement role-based access control separating `app_maintenance` (admin) from sales roles (`inside_sales`, `outside_sales`)
- Update RLS policies to gate INSERT on `customer_requests` and `request_spec_values` to sales roles only

---

## Milestone 8 — Role-Based Access Control
**Status:** ✅ Complete  
**Date:** 2026-05-13

### Prior Work
Milestone 7 complete. Security advisor findings resolved. RLS active on all tables.

### Dependencies
- `parts_matcher_role` JWT claim in `app_metadata` used for role detection
- `app_maintenance` role: full admin access
- `inside_sales` / `outside_sales` roles: can submit quote requests, cannot access admin screens

### Work Completed

**RLS Policy Updates**
- Added `parts_matcher.is_sales()` helper function: returns true if JWT claim `parts_matcher_role` is `inside_sales` or `outside_sales`
- Gated INSERT on `customer_requests` and `request_spec_values` to `is_sales()` only
- `app_maintenance` users retain full read access to workflow tables but cannot INSERT (by design — they manage catalog, not quotes)
- `app.js` frontend gating confirmed: already uses `parts_matcher_role === 'app_maintenance'` for `maybeShowAdminBtns()` — no code change needed

**Security Hardening — Round 2**
- `search_path` sweep: applied `SET search_path` to all 22 mutable-search-path functions across `content`, `game`, `live`, `player`, and `public` schemas (migration: `fix_function_search_paths`)
- `auth.uid()` init-plan sweep: replaced all bare `auth.uid()` calls in RLS USING/WITH CHECK clauses with `(SELECT auth.uid())` across 31 policies in `live` and `public` schemas (migration: `auth_uid_init_plan_sweep`). `player` and `game` schemas were already correct.
- FK indexes: added 8 covering indexes on foreign key columns across `parts_matcher` tables — `request_spec_values`, `catalog_item_specs`, `catalog_items`, `vendor_item_priority` (migration: `parts_matcher_fk_indexes`)

### Errors & Fixes
None.

### Deferred Items
- **Create `inside_sales` / `outside_sales` test users** — requires Supabase Auth dashboard access; deferred to Milestone 9 validation phase
- **End-to-end sales role validation** — blocked on user creation above

### Next Steps → Milestone 9
See Milestone 9 scope below.

---

## Milestone 9 — End-to-End Validation & Sales User Flow
**Status:** 🔲 Not Started  
**Date:** —

### Prior Work
Milestone 8 complete. All database hardening done. Frontend role-gating confirmed correct.

### Dependencies
- Supabase Auth dashboard access to create test users
- `inside_sales` and `outside_sales` users with correct `app_metadata.parts_matcher_role` claims

### Planned Work

**1. Create sales test users** *(requires dashboard)*
- Create one `inside_sales` user and one `outside_sales` user via Supabase Auth
- Set `app_metadata: { "parts_matcher_role": "inside_sales" }` (and `outside_sales` respectively)
- Confirm JWT claims are present in session on login

**2. Validate quote workflow as a sales user**
- Log in as `inside_sales` → select product type → submit request → confirm `customer_requests` INSERT succeeds
- Confirm `run_match` RPC returns ranked results
- Confirm admin tabs are hidden
- Confirm `app_maintenance` user cannot INSERT into `customer_requests`

**3. Validate admin screens as `app_maintenance`**
- Confirm all 7 `admin-*.js` modules load and operate correctly
- Confirm admin user can manage catalog, brands, specs, vendors, priorities

**4. `results.js` hardening**
- Review empty-state and error handling in match results rendering
- Add graceful fallback if `run_match` returns no results or an error

**5. Final security advisor pass**
- Run after all user/policy validation
- Target: zero ERRORs, zero new WARNs

**6. Sign-off**
- Document validated test results in this tracker
- Mark Milestone 9 complete

### Errors & Fixes
_To be filled in as work progresses._
