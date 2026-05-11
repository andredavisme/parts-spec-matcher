# Data Architecture

## Schema Isolation

All tables for this application live in a dedicated PostgreSQL schema named `parts_matcher` within the shared Supabase project (`andredavisme's Project`, region: us-west-2). This keeps the data cleanly separated from any other projects or schemas on the same instance.

## Entity Groups

### Reference / Lookup Tables
Controlled data maintained by the DBA. These define the vocabulary of the system.

| Table | Purpose |
|---|---|
| `vendors` | Companies the distributor has purchasing relationships with |
| `brands` | Product brands (may differ from vendor; e.g., vendor distributes multiple brands) |
| `product_categories` | Top-level groupings (e.g., Conveyor Components, Bearings) |
| `product_types` | Specific product types within a category (e.g., Conveyor Roller, Tapered Roller Bearing) |
| `spec_definitions` | Named spec fields per product type (e.g., "Roller Diameter", "Load Rating") |
| `spec_units` | Controlled unit vocabulary (e.g., inches, mm, lbs, RPM) |

### Catalog Tables
Represent actual products from vendor/brand catalogs.

| Table | Purpose |
|---|---|
| `catalog_items` | Individual stocked or quotable items with part number and brand reference |
| `catalog_item_specs` | Spec values for each catalog item, keyed to `spec_definitions` |
| `vendor_item_priority` | Priority rank when multiple vendors/brands supply an equivalent item |
| `source_documents` | Record of the catalog PDF or URL each item was sourced from |

### Workflow Tables
Support the sales rep quote workflow.

| Table | Purpose |
|---|---|
| `quote_templates` | Template per product type listing required spec fields |
| `quote_template_fields` | Ordered fields within a template with display labels and required flags |
| `customer_requests` | A logged instance of a customer quote request |
| `request_spec_values` | Spec values entered by the sales rep for a specific request |
| `match_results` | Candidate catalog items returned for a request, with match score and vendor priority |

## Vendor Priority Logic

When multiple brands supply an identical or equivalent item, the system uses the `vendor_item_priority` table to rank results. Priority is set by the DBA and can reflect:

- Preferred vendor relationships
- Margin or pricing agreements
- Stock availability tiers

Match results are returned ordered by: (1) spec match completeness, (2) vendor priority rank.

## Data Integrity Rules

- All foreign keys enforced at the database level
- Spec unit values restricted to the `spec_units` controlled table
- Product types must belong to a valid product category
- Catalog items must reference a valid brand and product type
- Audit columns (`created_at`, `updated_at`, `created_by`) on all mutable tables
- No direct deletion of reference data — soft delete via `is_active` flag

## Catalog Data Sourcing

Initial data will be entered manually by the DBA from:
- Brand-supplied PDF catalogs
- Public-facing brand web catalogs
- Vendor price sheets

Future consideration: structured import templates (CSV) for bulk catalog entry.
