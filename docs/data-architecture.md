# Data Architecture

## Schema Isolation

All tables for this application live in a dedicated PostgreSQL schema named `parts_matcher` within the shared Supabase project (`andredavisme's Project`, region: us-west-2). This keeps the data cleanly separated from any other projects or schemas on the same instance.

---

## Entity Groups

### Reference / Lookup Tables
Controlled data maintained by the DBA. These define the vocabulary of the system. **Unchanged from original design — used by both sales-rep and customer-initiated workflows.**

| Table | Purpose |
|---|---|
| `vendors` | Companies that supply products to distributors (upstream of distributors; not customer-facing) |
| `brands` | Product brands (may differ from vendor; e.g., vendor distributes multiple brands) |
| `product_categories` | Top-level groupings (e.g., Conveyor Components, Bearings) |
| `product_types` | Specific product types within a category (e.g., Conveyor Roller, Tapered Roller Bearing) |
| `spec_definitions` | Named spec fields per product type (e.g., "Roller Diameter", "Load Rating") |
| `spec_units` | Controlled unit vocabulary (e.g., inches, mm, lbs, RPM) |

> **Vendor vs. Distributor distinction:** A `vendor` is an upstream supplier relationship (who the distributor buys from). A `distributor` is a customer-facing authorized seller. These are separate entities.

### Catalog Tables
Represent actual products from vendor/brand catalogs. **Unchanged — customers and sales reps query the same catalog.**

| Table | Purpose |
|---|---|
| `catalog_items` | Individual stocked or quotable items with part number and brand reference |
| `catalog_item_specs` | Spec values for each catalog item, keyed to `spec_definitions` |
| `vendor_item_priority` | Priority rank per vendor + brand + product type — now scoped per distributor (see Vendor Priority Logic) |
| `source_documents` | Record of the catalog PDF or URL each item was sourced from |

### Distributor & Authorization Tables *(New — End-User Pivot)*
Support the distributor-neutral, manufacturer-authorization model.

| Table | Purpose |
|---|---|
| `distributors` | Registered authorized distributors on the platform |
| `manufacturer_authorizations` | Which distributor is authorized to sell which brand + product type combinations |

### Workflow Tables
Support both sales-rep-initiated and customer-initiated workflows.

#### Existing (Modified)

| Table | Change | Purpose |
|---|---|---|
| `quote_templates` | None | Template per product type listing required spec fields |
| `quote_template_fields` | Add `plain_language_label`, `condition_field_id`, `condition_value` | Drives guided intake on customer portal; enables conditional question logic |
| `customer_requests` | Add `initiated_by`, `customer_session_id`, `status` | Tracks whether request came from sales rep or customer portal; links to session |
| `request_spec_values` | None | Spec values entered for a specific request (same structure regardless of initiator) |
| `match_results` | Change `match_notes` to structured `spec_delta_notes` (JSONB) | Enables customer-facing spec delta display, not just internal rep notes |

#### New *(End-User Pivot)*

| Table | Purpose |
|---|---|
| `customer_sessions` | Anonymous or authenticated customer portal sessions with expiry |
| `customer_rfq_requests` | Customer-initiated RFQ routed to a specific distributor after match selection; child of `customer_requests` |
| `rfq_status_log` | Tracks state transitions per RFQ: `submitted → viewed → responded → closed` |

---

## Match Engine

The core matching logic is implemented as a PostgreSQL function invoked via Supabase RPC. **The function itself is unchanged** — it operates on a `customer_request` record regardless of whether the request was initiated by a sales rep or a customer via the portal.

```sql
SELECT * FROM parts_matcher.run_match(p_request_id := 1);
```

### How It Works

1. Resolves the `product_type_id` for the given `customer_request`
2. Clears any existing `match_results` for that request (idempotent — safe to re-run)
3. Loads all active `catalog_items` for the product type
4. For each item, scores every customer-supplied spec field against the catalog spec value using the field's `match_type`:

| match_type | Logic | Score Range |
|---|---|---|
| `exact` | 1.0 if values match (case-insensitive for text), 0.0 if not | 0 or 1 |
| `nearest` | `1.0 / (1.0 + abs(customer − catalog))` — smooth inverse distance | 0 < score ≤ 1 |
| `range` | 1.0 if `customer_value ≤ catalog_value` (customer requirement met), 0.0 if not | 0 or 1 |

5. Aggregates field scores: `(sum of field scores / total fields supplied) × 100`, rounded to 2 decimal places
6. Applies `vendor_item_priority.priority_rank` as a secondary sort (lower rank = more preferred)
7. Writes results to `match_results` and returns them ordered by score DESC, priority_rank ASC

### spec_delta_notes (Modified)

Previously stored as a raw string (`match_notes`), spec delta information is now stored as **JSONB** in `spec_delta_notes` to support customer-facing display:

```json
[
  { "field": "Shaft Diameter", "match_type": "nearest", "customer_value": "1.00", "catalog_value": "1.125", "score": 0.47 },
  { "field": "Shell Material", "match_type": "exact", "customer_value": "stainless", "catalog_value": "steel", "score": 0.0 }
]
```

This allows the frontend to render plain-language explanations (e.g., *"Shaft diameter: you specified 1.00\", closest match is 1.125\""*) rather than raw internal debug strings.

### RPC Call from Frontend

Called from the Supabase JS client after `request_spec_values` are inserted:

```javascript
const { data, error } = await supabase.rpc('run_match', { p_request_id: requestId });
```

The function uses `SECURITY DEFINER` so it executes with the permissions of its owner. RLS policies govern which callers can insert `request_spec_values` and read `match_results` (see Auth & RLS below).

---

## Vendor Priority Logic

### Original (Single-Distributor)
The `vendor_item_priority` table originally stored a global priority rank per vendor + brand + product type, reflecting one distributor's margin/relationship preferences.

### Revised (Per-Distributor)
In the distributor-neutral model, `vendor_item_priority` is scoped **per distributor**. Each registered distributor configures their own priority preferences. This means:

- A customer-facing match result shows distributor-specific availability signals, not a single global ranking
- Multiple distributors can have different priority rankings for the same brand/product type
- The match engine's secondary sort applies distributor-specific priority when a distributor context is present; falls back to global rank (spec score only) for anonymous browsing

> **Schema change required:** Add `distributor_id` FK to `vendor_item_priority` with a nullable migration path — existing rows represent legacy global priority and remain valid until migrated.

---

## Auth & RLS

### Role Layers

| Role | Access |
|---|---|
| **anon (public)** | Read: `product_categories`, `product_types`, `spec_definitions`, `catalog_items`, `distributors`, `manufacturer_authorizations` |
| **customer_session** | Write: `customer_requests`, `request_spec_values`; Read: own `match_results`, own `rfq_status_log` |
| **distributor** | Read: `customer_rfq_requests` routed to them; Write: `rfq_status_log` for their requests |
| **sales_rep** | Existing authenticated role — full workflow access as before |
| **admin** | Full access gated by JWT `app_metadata` claim `{ "parts_matcher_role": "admin" }` |

### Customer Session Auth
Customer portal access does not require account creation to browse or run a match. A `customer_session` record is created on portal entry with a short-lived token. Account creation (email) is optional and unlocks RFQ request tracking and status visibility.

---

## Guided Intake — New Fields on `quote_template_fields`

To support conditional, plain-language question flow on the customer portal:

| New Column | Type | Purpose |
|---|---|---|
| `plain_language_label` | text | Customer-facing question text (e.g., "Is this motor for indoor or outdoor use?") |
| `condition_field_id` | integer (FK) | If set, this field only appears after the referenced field has been answered |
| `condition_value` | text | The specific value the `condition_field_id` must equal for this field to appear |

If `condition_field_id` is null, the field always appears. This enables progressive disclosure without requiring a separate question-logic table.

---

## Catalog Data Sourcing

As of Milestone 5, the following catalog items are loaded (8 total across 4 product types):

| ID | Brand | Part Number | Description | Product Type |
|---|---|---|---|---|
| 1 | Browning | BRW-CR-190-24-0500 | Steel Conveyor Roller, 1.9" dia × 24" BF, 1/2" shaft | Conveyor Roller |
| 2 | Dodge | DGE-CR-250-36-0750 | Galvanized Conveyor Roller, 2.5" dia × 36" BF, 3/4" shaft | Conveyor Roller |
| 3 | Rexnord | RXN-CR-350-48-1000 | Heavy Duty Conveyor Roller, 3.5" dia × 48" BF, 1" shaft | Conveyor Roller |
| 4 | SKF | 6205-2RS | Single row deep groove ball bearing, 25mm bore, sealed | Deep Groove Ball Bearing |
| 5 | NSK | 6205-2Z | Single row deep groove ball bearing, 25mm bore, shielded | Deep Groove Ball Bearing |
| 6 | Dodge | P2B-IP-100 | Cast iron pillow block, 1" bore | Pillow Block Bearing |
| 7 | Tsubaki | 50-1-10FT | ANSI #50 single strand roller chain, 10ft | Roller Chain |
| 8 | Rexnord | 40-1-10FT | ANSI #40 single strand roller chain, 10ft | Roller Chain |

Real catalog data will be sourced from:
- Brand-supplied PDF catalogs
- Public-facing brand web catalogs
- Vendor price sheets

---

## Admin Data Management

All reference and catalog tables support two update paths available to admin users:

### 1. Admin UI (Milestone 6)
The frontend admin screen provides form-based add/edit/deactivate for all reference tables:
- Vendors, Brands, Product Categories, Product Types, Spec Definitions, Spec Units
- Catalog Items, Catalog Item Specs, Vendor Item Priority, Source Documents
- **New:** Distributors, Manufacturer Authorizations

All write operations are gated by `parts_matcher.is_admin()` RLS helper.

### 2. CSV Bulk Upload (Milestone 6)
The admin screen provides downloadable CSV templates for each table. Recommended for:
- Initial catalog item entry from brand PDF/web catalogs
- Bulk spec value updates across many items
- Vendor priority table setup across many product types, brands, and distributors
- Distributor and manufacturer authorization onboarding

---

## Data Integrity Rules

- All foreign keys enforced at the database level
- Spec unit values restricted to the `spec_units` controlled table
- Product types must belong to a valid product category
- Catalog items must reference a valid brand and product type
- `manufacturer_authorizations` requires both a valid `distributor_id` and `brand_id`
- Audit columns (`created_at`, `updated_at`, `created_by`) on all mutable tables
- No direct deletion of reference data — soft delete via `is_active` flag
- `customer_sessions` expire automatically via Supabase Auth TTL or a scheduled cleanup function
