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
| `vendor_item_priority` | Priority rank per vendor + brand + product type combination |
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

When multiple brands supply an identical or equivalent item, the system uses the `vendor_item_priority` table to rank results. Priority is set per **vendor + brand + product type** combination, and can reflect:

- Preferred vendor/brand relationships
- Margin or pricing agreements
- Stock availability tiers
- Application-specific preferences (e.g., heavy duty vs. standard)

Match results are returned ordered by: (1) spec match completeness, (2) vendor priority rank (ascending).

> **Schema note:** The `vendor_item_priority` table was updated in Milestone 2 (migration: `vendor_item_priority_add_brand_id`) to add `brand_id` and replace the original `UNIQUE (vendor_id, product_type_id)` constraint with `UNIQUE (vendor_id, brand_id, product_type_id)`. This allows multiple brands per vendor to be ranked independently for a given product type.

## Data Integrity Rules

- All foreign keys enforced at the database level
- Spec unit values restricted to the `spec_units` controlled table
- Product types must belong to a valid product category
- Catalog items must reference a valid brand and product type
- Audit columns (`created_at`, `updated_at`, `created_by`) on all mutable tables
- No direct deletion of reference data — soft delete via `is_active` flag

## Catalog Data Sourcing

Initial placeholder data has been entered for Conveyor Roller (3 items, 3 brands) to support end-to-end workflow testing. Real catalog data will be sourced from:
- Brand-supplied PDF catalogs
- Public-facing brand web catalogs
- Vendor price sheets

## Admin Data Management

All reference and catalog tables support two update paths available to admin users:

### 1. Admin UI (Milestone 6)
The frontend admin screen will provide form-based add/edit/deactivate for all reference tables:
- Vendors, Brands, Product Categories, Product Types, Spec Definitions, Spec Units
- Catalog Items, Catalog Item Specs, Vendor Item Priority, Source Documents

All write operations are gated by `parts_matcher.is_admin()` RLS helper, which checks the JWT `app_metadata` claim `{ "parts_matcher_role": "admin" }`.

### 2. CSV Bulk Upload (Milestone 6)
The admin screen will provide downloadable CSV templates for each table. The DBA can populate a template and upload it to batch-insert or batch-update records. This is the recommended path for:
- Initial catalog item entry from brand PDF/web catalogs
- Bulk spec value updates across many items
- Vendor priority table setup across many product types and brands

CSV templates will be generated from the live schema and include column headers, data type hints, and example rows. Uploaded CSVs will be validated against the schema before insert.
