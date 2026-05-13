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

- Added 24 `catalog_item_specs` records (8 specs × 3 items)
- Added 3 `vendor_item_priority` records for Conveyor Roller:
  - Rank 1: Browning (preferred — best margin)
  - Rank 2: Dodge (good availability)
  - Rank 3: Rexnord (heavy duty applications)

### Errors & Fixes

**Schema Fix — `vendor_item_priority` missing `brand_id`**
- Fix: migration `vendor_item_priority_add_brand_id` — dropped old unique constraint, added `brand_id`, new unique constraint `(vendor_id, brand_id, product_type_id)`

**Cleanup — Orphaned rows**
- Deleted rows where `brand_id IS NULL`

### Next Steps → Milestone 3
- Replace placeholder catalog items with real part data
- Run end-to-end match workflow manually to validate before building query engine

---

## Milestone 3 — Quote Template Builder
**Status:** ✅ Complete  
**Date:** 2026-05-11

### Prior Work
Milestone 2 complete. Reference data seeded, placeholder catalog items in place.

### Dependencies
- `spec_definitions` and `spec_units` populated for all 43 product types ✅
- `quote_templates` and `quote_template_fields` tables created ✅

### Work Completed

- Confirmed 1 `quote_templates` record (ID: 1) and 8 fields for Conveyor Roller already in place
- Migration `parts_matcher_quote_templates_all_product_types`: inserted 42 new templates (IDs 2–43) and all `quote_template_fields` for every remaining product type
- Final counts: 43 templates, 228 fields

### Errors & Fixes
None.

### Next Steps → Milestone 4
- Build `parts_matcher.run_match(p_request_id)` PostgreSQL function

---

## Milestone 4 — Match Query Engine
**Status:** ✅ Complete  
**Date:** 2026-05-11

### Prior Work
Milestone 3 complete. Quote templates built for all 43 product types.

### Dependencies
- Catalog items with complete spec values for Conveyor Roller ✅
- Vendor priority data ✅

### Work Completed

- Inserted test `customer_requests` (ID: 1) and 8 `request_spec_values`
- Built `parts_matcher.run_match(p_request_id)` with scoring:
  - `exact` → 1.0/0.0; `nearest` → `1/(1+|diff|)`; `range` → 1.0 if customer ≤ catalog
  - Score = `(sum / count) * 100`, secondary sort by vendor priority rank
- Test results validated (Dodge rank 1 at 90.53, Browning rank 2 at 46.97, Rexnord rank 3 at 31.79)

### Errors & Fixes
- Ambiguous column reference in RETURNS TABLE → prefixed all output columns with `out_`
- Cannot change return type → DROP before CREATE in migration

### Next Steps → Milestone 5
- Build frontend

---

## Milestone 5 — Frontend Interface
**Status:** ✅ Complete  
**Date:** 2026-05-12

### Prior Work
Milestone 4 complete. Match engine functional.

### Dependencies
- Supabase publishable key
- GitHub Pages (`gh-pages` branch)

### Work Completed

- Deployed static SPA to GitHub Pages
- Files: `index.html`, `js/app.js`, `js/auth.js`, `js/config.js`, `js/selector.js`, `js/request.js`, `js/results.js`, `css/`
- Auth: Supabase email/password; role gating via `parts_matcher_role` JWT claim

### Errors & Fixes
None recorded.

### Next Steps → Milestone 6
- Build admin screens

---

## Milestone 6 — Admin / DBA Tooling
**Status:** ✅ Complete  
**Date:** 2026-05-12

### Prior Work
Milestone 5 complete. Sales rep interface functional.

### Dependencies
- `app_maintenance` JWT claim for admin role gating

### Work Completed

- `js/admin-vendors.js`, `js/admin-brands.js`, `js/admin-product-types.js`, `js/admin-priority.js`, `js/admin-specs.js`, `js/admin-catalog.js`, `js/admin-upload.js`
- All admin tabs hidden for non-`app_maintenance` users

### Errors & Fixes
None recorded.

### Next Steps → Milestone 7
- Run security advisor

---

## Milestone 7 — Security Hardening (Round 1)
**Status:** ✅ Complete  
**Date:** 2026-05-12

### Prior Work
Milestone 6 complete.

### Work Completed

- Fixed RLS silently inactive on `client_lawnscaping` tables (migration: `enable_rls_client_lawnscaping`)
- Revoked `anon` access to `public.run_match` (migration: `revoke_anon_run_match_and_fix_search_path`)
- Fixed mutable `search_path` on `parts_matcher.run_match`

### Errors & Fixes
None beyond those addressed above.

### Next Steps → Milestone 8
- Implement role-based access control for sales roles

---

## Milestone 8 — Role-Based Access Control
**Status:** ✅ Complete  
**Date:** 2026-05-13

### Prior Work
Milestone 7 complete.

### Work Completed

- Added `parts_matcher.is_sales()` helper: returns true for `inside_sales` or `outside_sales` JWT claim
- Gated INSERT on `customer_requests` and `request_spec_values` to `is_sales()` only
- `search_path` sweep across 22 functions (migration: `fix_function_search_paths`)
- `auth.uid()` init-plan fix across 31 policies (migration: `auth_uid_init_plan_sweep`)
- FK indexes: 8 covering indexes on foreign key columns across `parts_matcher` tables (migration: `parts_matcher_fk_indexes`)

### Errors & Fixes
None.

### Next Steps → Milestone 9
- Create test sales users and validate end-to-end

---

## Milestone 9 — End-to-End Validation
**Status:** ✅ Complete  
**Date:** 2026-05-13

### Prior Work
Milestone 8 complete. All database hardening done. Frontend role-gating confirmed correct in code review.

### Dependencies
- Supabase Auth — test users with correct `app_metadata.parts_matcher_role` claims
- Private/incognito browser to isolate sessions

### Work Completed

**Test Users Created**
- `dev@chronicle.local` — `app_maintenance` (admin) role, confirmed + has password
- `inside@dev.local` — `inside_sales` role, confirmed + has password (`rugrat`)

**Sales User Flow — Validated**
- Signed in as `inside@dev.local` → product type selector loads → Conveyor Roller spec form renders → submitted request → `run_match` RPC returned ranked results ✅
- Admin buttons correctly hidden for `inside_sales` user ✅

**Admin Flow — Validated**
- Signed in as `dev@chronicle.local` → admin buttons visible ✅
- Tested add/edit on Vendors, Brands, Product Types, Vendor Priority, Spec Definitions, Catalog Items — all CRUD operations successful ✅

**Zero Spec Values Edge Case**
- Attempted match with no spec values filled in — exposed 403 on `pm_vendor_item_priority` and `pm_customer_requests` due to session loss (see errors below)

### Errors & Fixes

**1. Admin buttons not visible (`dev@chronicle.local`)**
- Root cause: global `.hidden { display: none !important; }` CSS rule was missing
- Fix: added rule to `css/styles.css`

**2. `run_match` 400 — return type mismatch**
- Root cause: `public.run_match` wrapper declared different OUT column names (`out_match_score`, `out_vendor_priority_rank`) than `parts_matcher.run_match` (`out_score`, `out_vendor_priority`, `out_rank`)
- Fix: migration `fix_public_run_match_return_type` — DROP + CREATE `public.run_match` with correct column names matching the inner function

**3. `results.js` referencing stale column names**
- Root cause: JS code used `row.out_match_score` and `row.out_vendor_priority_rank`
- Fix: updated `js/results.js` to use `out_score`, `out_vendor_priority`, `out_rank`

**4. Login 400 (`inside@dev.local`)**
- Root cause: password not remembered
- Fix: reset via `UPDATE auth.users SET encrypted_password = crypt('rugrat', gen_salt('bf'))` — user was already confirmed

**5. `pm_*` views 403 — missing direct table grants**
- Root cause: `security_invoker = true` views pass the caller's identity to RLS, but `authenticated` role had no direct GRANT on the underlying `parts_matcher` tables
- Fix: migration `grant_authenticated_all_parts_matcher_tables` — granted SELECT/INSERT/UPDATE/DELETE on all 12 admin-managed tables and `USAGE, SELECT ON ALL SEQUENCES` to `authenticated`

**6. Tracking prevention blocking Supabase JS session storage (private browser)**
- Root cause: `supabase-js` loaded from `cdn.jsdelivr.net` (third-party origin); Edge's Intelligent Tracking Prevention blocks third-party storage access, which breaks session persistence across page navigations
- Fix (temporary): switched to in-memory storage adapter in `js/auth.js` — sessions survive navigation within a single page load but are lost on full reload
- Fix (permanent): created GitHub Actions workflow (`.github/workflows/vendor-supabase.yml`) to download the UMD bundle and commit it to `js/vendor/supabase.min.js` (same-origin); updated `index.html` to load from `js/vendor/supabase.min.js` instead of CDN — tracking prevention no longer applies

### Deferred Items
- Zero-spec-values edge case not fully validated (session loss interrupted testing) — recommend adding client-side guard in `request.js` to require at least one spec value before enabling the Submit button
- Delete operation not explicitly tested on all admin screens (add/edit confirmed; delete assumed working given same permission path)
- `outside_sales` role not yet exercised — functionality expected to be identical to `inside_sales`; validate before production

### Next Steps → Milestone 10
- Add at least one real brand catalog (CSV bulk upload) for a second product type beyond Conveyor Roller
- Validate CSV upload flow end-to-end as admin
- Add client-side guard in `request.js`: disable Submit if no spec values entered
- Test `outside_sales` role
- Final security advisor pass; target zero ERRORs
