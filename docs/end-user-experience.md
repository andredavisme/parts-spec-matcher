# End User Experience

## Overview

This document defines the **End User Customer** role, their experience within the Parts Spec Matcher platform, and the principles that govern how the platform serves them.

The platform is **publicly owned and distributor-neutral** — it serves the customer's interest first, with authorized distributors participating as fulfillment partners rather than controlling the experience.

---

## The Problem This Solves

In the traditional industrial parts procurement channel:

- A manufacturer produces a product and authorizes specific distributors to sell it
- A customer needs a part and contacts a distributor
- The customer has little visibility into what products exist, whether they match their specs, or what their options are
- The customer is entirely dependent on the distributor's knowledge, attention, and availability
- The customer is the most directly involved stakeholder — they own the machine, they know the application — yet they have the least information and control

This platform changes that dynamic without bypassing the authorized distribution channel.

---

## End User Role Definition

| Attribute | Description |
|---|---|
| Who they are | The person or organization that owns/operates the equipment and needs the part |
| How they access the platform | Self-service portal (public URL, no sales rep required to initiate) |
| What they can do | Describe their need, answer guided spec questions, view ranked product matches, select a fulfillment path |
| What they cannot do | Purchase directly (distributor authorization is preserved) |
| What they gain | Transparency into what products match their specs and which authorized distributors can fulfill |

---

## Updated User Roles

| Role | Responsibilities |
|---|---|
| **End User (Customer)** | Self-initiate a spec request; answer guided questions; view match results; select a distributor to fulfill |
| Sales Representative | Respond to distributor-routed requests; support customer questions; process quotes |
| Distributor | Registered authorized seller for one or more manufacturer product lines; receives routed customer requests |
| Database Administrator | Maintain vendor, brand, catalog, spec, and distributor authorization data |

---

## Customer-Initiated Workflow

### Step 1 — Customer Arrives at Portal
The customer visits the public-facing portal URL. No account required to begin. They select a **product category** (e.g., Motors, Belts, Conveyor Components).

### Step 2 — Guided Spec Intake
Rather than a blank spec form, the customer is guided through a progressive question sequence informed by the product type's spec definitions. Questions are written in plain language:

- "Is this motor for indoor or outdoor use?"
- "What voltage is available at your installation site?"
- "What is the shaft diameter of the part you're replacing?"

Conditional logic surfaces only relevant follow-up questions based on prior answers. Customers may indicate "I don't know" for optional fields without blocking progress.

### Step 3 — Spec Confirmation
The customer reviews a summary of their captured specs before submission. They can edit any field.

### Step 4 — Match Results Displayed
The platform runs the match engine against the customer's spec values and displays ranked results:

- Product name, manufacturer, and key matching specs
- Match completeness score (e.g., "9 of 11 specs matched")
- Spec delta notes where a match is close but not exact (e.g., "Shaft diameter: you specified 1.00", closest match is 1.125"")
- Availability tier (in stock / special order / lead time estimate) where data is available

### Step 5 — Distributor Selection
For each matched product, the customer sees which **authorized distributors** carry that product line. The customer selects a distributor and submits a structured quote request.

The platform does not process payment or bypass the distributor. It routes an informed, spec-complete request to the distributor of the customer's choosing.

### Step 6 — Distributor Response
The distributor receives a structured quote request with full spec context. They respond to the customer directly (email or in-platform messaging, TBD). The customer can track request status.

---

## Design Principles

- **Customer-first, channel-compliant** — The customer is empowered without circumventing manufacturer authorization requirements
- **Plain language intake** — Spec fields are translated into guided questions; technical jargon is minimized
- **Transparent matching** — Customers see *why* a product was recommended, including where it deviates from their specs
- **Distributor neutrality** — No single distributor is favored; ranking reflects spec fit, availability, and authorization — not commercial relationships
- **No-account entry** — Customers can explore matches without registration; account creation is optional for request tracking

---

## Data Entities Added by This Model

| Entity | Purpose |
|---|---|
| `distributor` | Registered authorized distributors on the platform |
| `manufacturer_authorization` | Which distributors are authorized to sell which brand/product lines |
| `customer_request` | Customer-initiated spec request (replaces sales-rep-initiated quote) |
| `customer_session` | Anonymous or authenticated customer session for portal access |
| `request_status` | Tracks state of a customer request through distributor response |

---

## Relationship to Sales-Rep Workflow

The existing sales-rep-initiated workflow (see `quote-workflow.md`) remains valid for distributor-initiated engagements. The two workflows converge at the match engine and quote generation steps — the difference is who initiates and who has visibility.

- **Sales-rep-initiated:** Rep enters specs on behalf of customer → internal match → rep quotes customer
- **Customer-initiated:** Customer enters specs via portal → public match display → customer selects distributor → structured request routed to rep

Both paths use the same underlying spec definitions, match engine, and catalog data.
