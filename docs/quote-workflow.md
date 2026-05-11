# Quote Workflow

## Overview

The quote workflow allows a sales representative to respond to a customer part request by generating a structured spec requirements document, capturing the customer's response, and retrieving matching catalog items — all within the app.

---

## Step-by-Step Workflow

### Step 1 — Customer Inquiry
A customer contacts a sales representative requesting a quote for a part. Example: *"I need a conveyor roller."*

### Step 2 — Sales Rep Opens App
The sales rep selects the relevant **Product Type** from the app (e.g., Conveyor Components > Conveyor Roller).

### Step 3 — Generate Requirements Document
The app pulls the associated `quote_template` for that product type and generates a document listing all required and optional spec fields with:
- Field name and description
- Accepted units
- Whether the field is required or optional
- Any notes or guidance for the customer

This document is delivered to the customer (email, print, or PDF export).

### Step 4 — Customer Returns Specs
The customer reviews the document and provides their known values. They may leave optional fields blank.

### Step 5 — Sales Rep Enters Values
The sales rep opens the customer request in the app and enters the returned spec values into the corresponding fields.

### Step 6 — Match Query
The app queries `catalog_items` and `catalog_item_specs` against the entered values, applying tolerance matching as defined per spec field. Results are ranked by:
1. Spec match completeness (number of fields matched)
2. Vendor priority (from `vendor_item_priority`)

### Step 7 — Review and Quote
The sales rep reviews the match list, selects the appropriate item(s), and proceeds to quote the customer.

---

## Conveyor Roller — Example Spec Fields

The following represents the expected spec fields for a Conveyor Roller quote template. Final field list to be confirmed by DBA during catalog entry.

| Field | Unit | Required | Notes |
|---|---|---|---|
| Roller Diameter | inches / mm | Yes | Outside diameter of roller shell |
| Roller Face Length | inches / mm | Yes | Usable belt contact length |
| Shaft Diameter | inches / mm | Yes | Shaft or axle diameter |
| Shaft Style | — | Yes | Fixed, spring-loaded, hex, etc. |
| Frame Bracket Type | — | Yes | Flat, formed, drop-in, etc. |
| Load Capacity | lbs / kg | Yes | Static or dynamic load rating |
| Operating Speed (RPM) | RPM | No | Max rotational speed |
| Shell Material | — | No | Steel, stainless, HDPE, etc. |
| Bearing Type | — | No | Sealed, open, etc. |
| Operating Temperature Range | °F / °C | No | Min/max environment temp |
| Special Coatings / Finish | — | No | Galvanized, painted, etc. |

---

## Document Format

The generated requirements document will include:
- Company header / branding
- Customer name and request reference number
- Product type being quoted
- Spec fields table with empty value column for customer to fill
- Submission instructions (return to sales rep by email or form)
