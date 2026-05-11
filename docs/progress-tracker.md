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

---

## Milestone 4 — Match Query Engine
**Status:** ✅ Complete  
**Date:** 2026-05-11

### Prior Work
Milestone 3 complete. Quote templates built for all 43 product types. Fields match spec definitions exactly.

### Dependencies
- Catalog items with complete spec values for at least one product type ✅ (3 Conveyor Roller items)
- Vendor priority data entered for at least one product type ✅ (Browning rank 1, Dodge rank 2, Rexnord rank 3)
- Defined tolerance / matching rules per spec field type ✅

### Work Completed

**Test Customer Request**
- Inserted 1 `customer_requests` record (ID: 1): product_type_id=1, template_id=1, customer_name="Test Customer", ref="TEST-001"
- Inserted 8 `request_spec_values` (IDs 1–8) covering all Conveyor Roller spec fields

**Scoring Logic**
- `exact` → 1.0 if match, 0.0 if not (case-insensitive for text)
- `nearest` → `1.0 / (1.0 + abs(customer_value - catalog_value))`
- `range` → 1.0 if `customer_value <= catalog_value`, else 0.0
- Final score = `(sum of field scores / total customer-supplied fields) * 100`
- Secondary sort: `vendor_item_priority.priority_rank` ASC

**Test Results — `SELECT * FROM parts_matcher.run_match(1)`**

| Rank | Brand | Part Number | Score | Vendor Priority |
|---|---|---|---|---|
| 1 | Dodge | DGE-CR-250-36-0750 | 90.53 | 2 |
| 2 | Browning | BRW-CR-190-24-0500 | 46.97 | 1 |
| 3 | Rexnord | RXN-CR-350-48-1000 | 31.79 | 3 |

**Migrations Applied**
- `parts_matcher_run_match_function_v2_drop_recreate` — final working version ✅

### Errors & Fixes

**Ambiguous column reference in RETURNS TABLE** — Fixed by prefixing all output columns with `out_`  
**Cannot change return type of existing function** — Fixed by `DROP FUNCTION IF EXISTS` before `CREATE FUNCTION`

### Next Steps → Milestone 5
- Scaffold Vanilla JS frontend on `gh-pages` branch
- Implement login view, product type selector, request form, and match results view

---

## Milestone 5 — Frontend Interface
**Status:** ✅ Complete  
**Date:** 2026-05-11

### Prior Work
Milestone 4 complete. Match engine functional and validated end-to-end.

### Dependencies
- Frontend stack: Vanilla HTML/CSS/JS hosted on GitHub Pages (`gh-pages` branch) ✅
- Supabase anon key for client queries ✅
- Auth strategy: Supabase email/password for sales reps ✅
- RLS: `authenticated_read` + `authenticated_insert` policies on all relevant `parts_matcher` tables ✅
- `public.run_match` wrapper function with `GRANT EXECUTE TO authenticated` ✅
- `public.pm_*` views over all `parts_matcher` tables with `security_invoker = false` ✅

### Work Completed

**Step 1 — Login Page + Product Type Selector**
- Created `gh-pages` branch from `main`
- Pushed 6 files: `index.html`, `css/styles.css`, `js/config.js`, `js/auth.js`, `js/selector.js`, `js/app.js`
- Session-aware: existing session bypasses login and goes straight to selector

**Step 2 — Request Form + Results View**
- Updated `index.html` to include all 4 views: `#view-login`, `#view-selector`, `#view-request`, `#view-results`
- `js/request.js`: loads active template, renders dynamic spec fields, inserts `customer_requests` + `request_spec_values`, calls `run_match` RPC
- `js/results.js`: renders ranked results table with score bars, brand, part number, vendor priority, miss notes
- Full 4-view navigation with back buttons and logout on all views

**Step 3 — Live End-to-End Test**
- Signed in as `dev@chronicle.local` (admin)
- Tested Conveyor Roller: match results screen returned 3 ranked results ✅
- Tested Deep Groove Ball Bearing and Chain Coupling: no results (expected — no catalog items for those types yet) ✅

**GitHub Pages**
- App live at: https://andredavisme.github.io/parts-spec-matcher/

### Errors & Fixes

**1. CDN global name collision**
- `const supabase` in `config.js` collided with the `supabase` global exposed by the jsdelivr CDN bundle.
- **Fix:** Renamed client variable to `sbClient` across all JS files.

**2. Stale anon key**
- `config.js` contained an old anon key from a previous session; Supabase returned `Invalid API key`.
- **Fix:** Fetched current key via MCP and updated `config.js`.

**3. Password reset via SQL — `crypt()` schema path**
- First password reset attempt used `crypt()` without schema qualification; function silently no-oped because `pgcrypto` lives in the `extensions` schema.
- **Fix:** Used `extensions.crypt()` and `extensions.gen_salt()` explicitly.

**4. `parts_matcher` schema not exposed to PostgREST**
- `.schema('parts_matcher').from(...)` queries returned 406, then 404 after the `ALTER ROLE` attempt.
- `ALTER ROLE authenticator SET pgrst.db_schemas` via SQL is overridden by Supabase's managed configuration on reload and cannot be set this way.
- **Fix:** Created `public.pm_*` views over all `parts_matcher` tables. All JS queries updated to use `pm_*` view names with no `.schema()` call.

**5. `security_invoker = true` blocked cross-schema view reads**
- Views with `security_invoker = true` over `parts_matcher` tables returned 403 because PostgREST couldn't resolve the cross-schema ownership chain for the calling role.
- **Fix:** Set `security_invoker = false` (security definer) on all `pm_*` views. Access control is enforced at the view grant level (`authenticated` role) and via RLS on the underlying tables for writes.

**6. INSERT permission denied for sequence**
- INSERT to `pm_customer_requests` returned `permission denied for sequence customer_requests_id_seq`.
- **Fix:** `GRANT USAGE, SELECT ON SEQUENCE parts_matcher.customer_requests_id_seq TO authenticated` and same for `request_spec_values_id_seq`. Also granted `INSERT` directly on the underlying tables.

**7. `run_match` RPC 404**
- `supabase.rpc('run_match', ...)` returned 404 because PostgREST only exposes functions in the `public` schema by default, and `parts_matcher.run_match` is not in `public`.
- **Fix:** Created `public.run_match(p_request_id integer)` as a `SECURITY DEFINER` wrapper that calls `parts_matcher.run_match`. Granted `EXECUTE` to `authenticated`.

**8. Wrong column names in `results.js`**
- `results.js` referenced `out_brand_name` and `out_miss_notes`; actual `run_match` return columns are `out_brand` and `out_match_notes`.
- **Fix:** Updated column references in `results.js` to match the actual function signature.

### Next Steps → Milestone 6
- Begin Milestone 6: Admin / DBA Tooling
- Admin screens needed: Catalog Items (primary), Vendors, Brands, Product Types, Spec Definitions, Vendor Item Priority
- CSV bulk upload support for catalog items and specs

---

## Milestone 6 — Admin / DBA Tooling
**Status:** 🔲 Not Started

### Prior Work
Milestone 5 complete. Sales rep interface validated end-to-end. Conveyor Roller match results confirmed working in production.

### Dependencies
- `dev@chronicle.local` confirmed as admin user (`parts_matcher_role: admin` in app_metadata) ✅
- RLS admin write policies already in place on all `parts_matcher` tables ✅
- `pm_*` public views in place for reads ✅

### Work Completed
_To be filled in as work progresses._

### Errors & Fixes
_To be filled in as work progresses._

### Next Steps
_To be defined upon Milestone 6 completion._
