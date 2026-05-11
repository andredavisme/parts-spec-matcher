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

| Product Type | Template Fields |
|---|---|
| Conveyor Roller | 8 |
| Conveyor Pulley | 6 |
| Deep Groove Ball Bearing | 7 |
| Tapered Roller Bearing | 8 |
| Pillow Block Bearing | 6 |
| Roller Chain | 5 |
| Engineering Class Chain | 4 |
| Conveyor Chain | 5 |
| Sprocket | 5 |
| Chain Coupling | 4 |
| Jaw Coupling | 6 |
| Grid Coupling | 5 |
| Disc Coupling | 5 |
| Rigid Coupling | 5 |
| Overrunning Clutch | 5 |
| Torque Limiter | 4 |
| Worm Gear Reducer | 6 |
| Helical Gear Reducer | 6 |
| Bevel Gear Reducer | 5 |
| Parallel Shaft Reducer | 5 |
| Right Angle Reducer | 5 |
| AC Induction Motor | 8 |
| DC Motor | 6 |
| Variable Frequency Drive | 6 |
| Gearmotors | 6 |
| Linear Bearing | 5 |
| Linear Actuator | 5 |
| Ball Screw | 5 |
| Linear Guide Rail | 5 |
| Oil Seal | 5 |
| O-Ring | 4 |
| V-Ring Seal | 3 |
| Mechanical Face Seal | 5 |
| Hex Bolt | 5 |
| Stud | 4 |
| Set Screw | 4 |
| Collar | 5 |
| Retaining Ring | 4 |
| Pneumatic Cylinder | 6 |
| Hydraulic Cylinder | 6 |
| Solenoid Valve | 6 |
| Pressure Regulator | 4 |
| Hydraulic Pump | 6 |

### Errors & Fixes
None encountered.

### Next Steps → Milestone 4
- Build the `parts_matcher.run_match(p_request_id integer)` PostgreSQL function as a Supabase RPC
- Function must:
  1. Read `request_spec_values` for the given `customer_request_id`
  2. Retrieve all active `catalog_items` for the same `product_type_id`
  3. Score each catalog item against customer values using `match_type` logic per spec field:
     - `exact` — value must match exactly (text or numeric); non-match scores 0 for that field
     - `nearest` — numeric proximity; score inversely proportional to deviation
     - `range` — customer value must fall within catalog item's range; binary pass/fail
  4. Apply `vendor_item_priority` rank as a secondary sort factor
  5. Insert scored results into `match_results` (or return them directly for preview)
- Create a test `customer_request` for Conveyor Roller using the existing 3 placeholder catalog items to validate match logic end-to-end before writing the function

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
- Inserted 8 `request_spec_values` (IDs 1–8) covering all Conveyor Roller spec fields:

| Spec | match_type | Customer Value | Design Intent |
|---|---|---|---|
| roller_diameter | nearest | 2.4" | Nearest to Dodge (2.5") |
| roller_length | nearest | 34" | Nearest to Dodge (36") |
| shaft_diameter | exact | 0.75" | Exact match: Dodge only |
| load_rating | range | 450 lbs | Passes Dodge (500) + Rexnord (1200); fails Browning (250) |
| max_speed | range | 450 RPM | Passes Browning (600) + Dodge (500); fails Rexnord (350) |
| material | exact | Steel | All 3 match |
| bearing_type | exact | Ball Bearing | Browning + Dodge match; Rexnord (Tapered) does not |
| finish | exact | Galvanized | Dodge only |

**Scoring Logic**
- Each spec field contributes equally (weight = 1.0)
- `exact` → 1.0 if match, 0.0 if not (case-insensitive for text)
- `nearest` → `1.0 / (1.0 + abs(customer_value - catalog_value))` — smooth proximity, always > 0
- `range` → 1.0 if `customer_value <= catalog_value`, else 0.0
- Final score = `(sum of field scores / total customer-supplied fields) * 100`, rounded to 2 decimal places
- Secondary sort: `vendor_item_priority.priority_rank` ASC
- Missing catalog spec values are excluded (NULL field_score) and do not penalize the item

**Migrations Applied**
- `parts_matcher_run_match_function` — initial attempt; failed on ambiguous column name in RETURNS TABLE
- `parts_matcher_run_match_function_v2` — failed; `CREATE OR REPLACE` blocked because return type changed
- `parts_matcher_run_match_function_v2_drop_recreate` — `DROP FUNCTION` then `CREATE FUNCTION` with unambiguous `out_` prefixed return column names; succeeded ✅

**Test Results — `SELECT * FROM parts_matcher.run_match(1)`**

| Rank | Brand | Part Number | Score | Vendor Priority | Misses |
|---|---|---|---|---|---|
| 1 | Dodge | DGE-CR-250-36-0750 | 90.53 | 2 | None |
| 2 | Browning | BRW-CR-190-24-0500 | 46.97 | 1 | shaft_dia(exact), load_rating(range), finish(exact) |
| 3 | Rexnord | RXN-CR-350-48-1000 | 31.79 | 3 | shaft_dia(exact), max_speed(range), bearing_type(exact), finish(exact) |

**Validation**
- Dodge ranks #1 at 90.53 despite vendor priority rank 2 — confirms score overrides vendor rank ✅
- Browning ranks #2 with correct miss notes ✅
- Rexnord ranks last with correct miss notes ✅
- Results written to `match_results` table ✅
- Re-running `run_match` clears and rewrites `match_results` for the request (idempotent) ✅

### Errors & Fixes

**Ambiguous column reference in RETURNS TABLE**
- First function version used `catalog_item_id` as both a RETURNS TABLE output column name and a CTE alias — PostgreSQL raised `42702: column reference is ambiguous`
- **Fix:** Prefixed all RETURNS TABLE column names with `out_` and all CTE-internal aliases with short disambiguating prefixes (`cs_`, `sd_`, `p_`, `r_`)

**Cannot change return type of existing function**
- `CREATE OR REPLACE` blocked because the return signature changed
- **Fix:** Used `DROP FUNCTION IF EXISTS parts_matcher.run_match(integer)` before `CREATE FUNCTION` in the same migration

### Next Steps → Milestone 5
- Decide frontend stack (framework, hosting) — React/Next.js + Vercel recommended
- Scaffold the frontend project
- Implement the Sales Rep interface with three views:
  1. **Product Type Selector** — dropdown of active product types
  2. **Request Form** — spec fields drawn from `quote_template_fields` for the selected product type; submit creates `customer_requests` + `request_spec_values` and calls `run_match`
  3. **Match Results View** — ranked list from `match_results` showing brand, part number, score, vendor priority, and miss notes
- Integrate Supabase client using the project's publishable key
- Auth strategy: Supabase email/password auth for sales rep login; JWT claim `parts_matcher_role: admin` for DBA access (already implemented in RLS)

---

## Milestone 5 — Frontend Interface
**Status:** 🔲 Not Started

### Prior Work
Milestone 4 complete. Match engine functional and validated end-to-end.

### Dependencies
- Frontend stack decision (framework, hosting)
- Supabase publishable key for client queries
- Auth strategy for sales rep login

### Work Completed
_To be filled in as work progresses._

### Errors & Fixes
_To be filled in as work progresses._

### Next Steps → Milestone 6
_To be defined upon Milestone 5 completion._

---

## Milestone 6 — Admin / DBA Tooling
**Status:** 🔲 Not Started

### Prior Work
Milestone 5 complete. Sales rep interface functional.

### Dependencies
- Defined admin role and permissions in Supabase auth
- RLS policies reviewed per table
- Admin screens: Vendors, Brands, Product Categories, Product Types, Spec Definitions, Catalog Items, Vendor Item Priority
- CSV bulk upload templates for all reference and catalog tables

### Work Completed
_To be filled in as work progresses._

### Errors & Fixes
_To be filled in as work progresses._

### Next Steps
_To be defined upon Milestone 6 completion._
