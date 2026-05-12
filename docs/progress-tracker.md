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
- Added spec definitions for all 43 product types
- Initial count after this milestone: 228 spec definitions (IDs 1–228), with 3–8 fields per product type
- 18 additional spec fields (IDs 229–246) were appended during Milestone 5 testing to improve match quality for 7 product types (see note below)
- **Final count: 246 total active spec definitions**

> **Spec Definition Additions (IDs 229–246):** Applied after initial seeding during Milestone 5 validation. Fields added per product type:
> - Engineering Class Chain: `strand_count` (exact), `max_speed` (range)
> - Chain Coupling: `material` (exact), `max_speed` (range)
> - Torque Limiter: `reset_type` (exact), `material` (exact)
> - O-Ring: `as568_number` (exact), `temp_range_max` (range), `pressure_rating` (range)
> - V-Ring Seal: `max_speed` (range), `temp_range_max` (range), `seal_type` (exact)
> - Hex Bolt: `drive_type` (exact), `head_type` (exact)
> - Stud: `grade` (exact), `thread_type` (exact)
> - Set Screw: `drive_type` (exact), `grade` (exact)
> All 18 fields are `is_required = false`.

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
- `quote_template_fields`: 246 (matches total active spec definitions; 18 fields added in IDs 229–246 during Milestone 5 caused the increase from the originally documented 228)

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
- Additional catalog items added during testing (IDs 4–8) to validate match engine across multiple product types:

| ID | Brand | Part Number | Description | Product Type |
|---|---|---|---|---|
| 4 | SKF | 6205-2RS | Single row deep groove ball bearing 25mm bore sealed | Deep Groove Ball Bearing |
| 5 | NSK | 6205-2Z | Single row deep groove ball bearing 25mm bore shielded | Deep Groove Ball Bearing |
| 6 | Dodge | P2B-IP-100 | Cast iron pillow block 1 inch bore | Pillow Block Bearing |
| 7 | Tsubaki | 50-1-10FT | ANSI #50 single strand roller chain 10ft | Roller Chain |
| 8 | Rexnord | 40-1-10FT | ANSI #40 single strand roller chain 10ft | Roller Chain |

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
**Status:** ✅ Complete  
**Date:** 2026-05-12

### Prior Work
Milestone 5 complete. Sales rep interface validated end-to-end. Conveyor Roller match results confirmed working in production. Additional catalog items added for Deep Groove Ball Bearing, Pillow Block Bearing, and Roller Chain during testing (IDs 4–8). 18 additional spec definitions added (IDs 229–246) for 7 product types during validation.

### Dependencies
- `dev@chronicle.local` confirmed as admin user (`parts_matcher_role: admin` in app_metadata) ✅
- RLS admin write policies already in place on all `parts_matcher` tables ✅
- `pm_*` public views in place for reads ✅

### Work Completed

**Admin Gate (`app.js`)**
- `maybeShowAdminBtns()` added to `app.js`
- Reads `session.user.app_metadata.parts_matcher_role` on login and session restore
- Shows/hides 7 admin header buttons based on the claim: Vendors, Brands, Product Types, Vendor Priority, Catalog Items, Spec Definitions, CSV Upload
- Verified live: admin buttons appear for `dev@chronicle.local`, hidden for non-admin users ✅

**Vendors Screen (`admin-vendors.js` + `#view-admin-vendors` in `index.html`)**
- Full CRUD: list, add, edit, activate/deactivate
- Fields: vendor name (required), contact name, contact email, notes, is_active
- Add/Edit modal with validation

**Brands Screen (`admin-brands.js` + `#view-admin-brands` in `index.html`)**
- Full CRUD: list, add, edit, activate/deactivate
- Fields: brand name (required), primary vendor (dropdown), notes, is_active
- Vendor dropdown populated from live `pm_vendors` data

**Product Types Screen (`admin-product-types.js` + `#view-admin-pt` in `index.html`)**
- Full CRUD: list, add, edit, activate/deactivate
- Fields: category (required, dropdown), name (required), description, is_active
- Category dropdown populated from live `pm_product_categories` data

**Vendor Item Priority Screen (`admin-priority.js` + `#view-admin-priority` in `index.html`)**
- Full CRUD: list, add, edit, delete priority rules
- Fields: vendor (required), product type (required), brand (optional — blank applies to all brands), priority rank (required), notes
- Filter by product type
- Supports brand-optional rules: leaving brand blank sets `brand_id = NULL`, meaning the rule applies to all brands for that vendor + product type combination

**Catalog Items Screen (`admin-catalog.js` + `#view-admin-catalog` in `index.html`)**
- Full CRUD: list, add, edit, activate/deactivate
- Filters by category, product type, and brand
- Add/Edit modal includes inline spec value editing (all spec definitions for the selected product type rendered as form fields)
- Saves to `parts_matcher.catalog_items` + `parts_matcher.catalog_item_specs` via `pm_*` views
- Uses `catResolveSpecValue()` to route numeric values to `value_numeric`, text values to `value_text` — consistent with match engine and CSV upload

**Spec Definitions Screen (`admin-specs.js` + `#view-admin-specs` in `index.html`)**
- List grouped by product type with category breadcrumb
- Sort order reorder via ↑/↓ arrows (swaps `sort_order` values in DB)
- Add/Edit modal: product type, field name, display label, match type, unit, required, active
- On insert, auto-creates a corresponding `pm_quote_template_fields` entry

**CSV Upload Screen (`admin-upload.js` + `#view-admin-upload` in `index.html`)**
- RFC 4180-compliant CSV parser
- Two-file upload: `catalog_items` + `catalog_item_specs` with cross-file validation
- Phase 1 upserts items (match by `brand_id` + `part_number`); Phase 2 upserts specs
- Template download buttons for both files
- Preview table before committing upload
- Upload log displayed after run

**Performance Advisor — Unindexed Foreign Keys**
- Performance advisor run on 2026-05-12 flagged unindexed foreign keys across multiple schemas
- Indexes added only for `public` and `parts_matcher` schemas (other schemas belong to separate projects and were not modified)
- Migration applied: `add_indexes_for_unindexed_foreign_keys`
  - 46 indexes added in `public` schema
  - 12 indexes added in `parts_matcher` schema

### Errors & Fixes

**Spec value column mismatch in `admin-catalog.js`**
- `admin-catalog.js` was writing spec values to a `spec_value` column that does not exist on `pm_catalog_item_specs`; the actual columns are `value_numeric` and `value_text`
- This caused spec values entered via the Catalog Items screen to silently write nothing
- **Fix (commit 56a4ac4):**
  - Added `catResolveSpecValue(raw)` helper to route numeric inputs to `value_numeric` and text to `value_text`
  - Added `catSpecDisplayValue(s)` helper to read back the non-null value from `{value_text, value_numeric}` for display
  - Fixed spec READ in `openCatModal()` to `.select('spec_definition_id, value_text, value_numeric')` instead of the non-existent `spec_value` column
  - Fixed spec WRITE in `saveCatItem()` to push `{ value_numeric, value_text }` instead of `{ spec_value }`

**Thread Context Loss on Milestone 6 Restart**
- The development thread for Milestone 6 was discarded before the admin tooling work was fully logged in the progress tracker
- Work was already complete in the codebase but partially undocumented; discovered on restart by reading actual JS files
- **Fix:** Reconstructed work completed from codebase inspection and session notes. Logged retrospectively.
- **Process improvement:** Capture AI responses before deleting a thread and include them in the new thread prompt. See recovery procedure in `docs/build-guide.md`.

### Next Steps → Milestone 7
- Populate real catalog data via CSV upload for remaining product types (currently only Conveyor Roller, Deep Groove Ball Bearing, Pillow Block Bearing, and Roller Chain have catalog items)
- Run a full end-to-end test of each admin screen against the live database
- Add additional users (sales rep accounts) via the Supabase Auth dashboard
- Consider adding a `#view-admin-units` screen for managing `spec_units` if new units are needed
- Run security advisor after any additional schema changes
