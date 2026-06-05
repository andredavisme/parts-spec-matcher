# RFQ Process — Collaboration Brief

*This document is intended as a plain-language overview of the Parts Spec Matcher project and its evolving direction, suitable for sharing with potential collaborators familiar with RFQ (Request for Quotation) processes in industrial procurement.*

---

## What This Project Is

Parts Spec Matcher is an open, publicly-owned platform being built to address a structural problem in industrial parts procurement: **the end user customer — the person who actually owns the equipment and needs the part — has the least visibility and control in a process they are most directly affected by.**

The platform is not proprietary to any distributor. It is designed to serve customers, with distributors participating as authorized fulfillment partners.

**Repository:** [https://github.com/andredavisme/parts-spec-matcher](https://github.com/andredavisme/parts-spec-matcher)

---

## The RFQ Problem This Addresses

In a standard industrial parts RFQ process:

1. A customer identifies a need (replacement part, upgrade, new installation)
2. The customer contacts one or more distributors to request a quote
3. The distributor manually researches vendor catalogs to find a matching product
4. The distributor returns a quote — often days later, often without explanation of *why* a particular product was selected
5. The customer accepts, negotiates, or starts over with another distributor

**What's broken:**
- The customer enters the process with incomplete information about what to ask for
- The distributor's catalog knowledge is opaque to the customer
- Spec mismatches aren't surfaced until after a product arrives (or fails)
- The customer cannot compare distributor responses on a common basis
- The RFQ is structured around the distributor's convenience, not the customer's need

---

## What We're Building

A **spec-driven, customer-initiated RFQ platform** with three core capabilities:

### 1. Guided Spec Intake
Customers answer plain-language, conditional questions about their application and equipment — not blank technical forms. The platform translates their answers into structured spec values using product-type-specific question logic.

### 2. Transparent Match Engine
The platform queries a structured catalog database and returns ranked product matches with:
- Spec match completeness scores
- Explanation of any spec deltas (where the closest match differs from the customer's stated spec)
- Availability signals where data exists

### 3. Distributor-Neutral Routing
The customer sees which **authorized distributors** carry each matched product and selects who to send their structured, spec-complete RFQ to. No single distributor controls the experience. The manufacturer authorization chain is respected.

---

## Current State

The project has an established:
- Data architecture (PostgreSQL via Supabase) with spec definitions, catalog items, vendor priority, and match engine logic
- Sales-rep-facing workflow (existing internal tool baseline)
- Documentation covering schema design, quote workflow, and build methodology

The platform is now being extended to support the **customer-initiated, distributor-neutral** model described above.

---

## Where Collaboration Would Be Valuable

If your current project touches any of the following, there may be strong integration potential:

- **RFQ workflow digitization** — structured intake, routing, and response tracking
- **Distributor/supplier network management** — authorization, territory, or product line relationships
- **Spec normalization** — translating customer-described needs into queryable structured data
- **Industrial product catalog data** — motors, belts, bearings, power transmission, conveyor components
- **Customer-side procurement tooling** — anything that gives buyers more information and control

---

## Integration Philosophy

This platform is being built to be open and composable:
- The match engine is a PostgreSQL function invocable via API (Supabase RPC)
- Spec definitions and catalog data are structured and extensible
- The frontend is intentionally lightweight (vanilla HTML/JS) to remain accessible and forkable
- The distributor integration layer is being designed as a connection interface, not a proprietary lockout

The goal is a platform that can connect to existing RFQ systems, not replace them — surfacing better spec context at the point where a customer initiates a request.

---

## Next Steps / Open Questions for Discussion

- What does your current RFQ intake process look like on the customer side?
- Are you working within a specific product category or industry vertical?
- Is your project distributor-facing, customer-facing, or both?
- What does the handoff from "customer submits request" to "distributor receives it" currently look like in your system?

---

*Built with Perplexity + Supabase + GitHub Pages. See `docs/build-guide.md` for methodology.*
