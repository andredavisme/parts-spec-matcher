# Parts Spec Matcher

An open, publicly-owned platform for industrial machine parts procurement — giving end user customers guided spec matching and transparent distributor routing, while preserving the authorized distribution channel.

## Business Objective

Reduce the redundant effort of researching multiple catalog sources to respond to customer quote requests. The platform supports both **sales-rep-initiated** and **customer-initiated** workflows, returning ranked spec matches from the catalog database and routing structured RFQ requests to authorized distributors.

## User Roles

| Role | Responsibilities |
|---|---|
| End User (Customer) | Self-initiate a spec request via portal; answer guided questions; view match results; select a distributor to fulfill |
| Sales Representative | Respond to distributor-routed requests; enter specs on behalf of customers; review match results; process quotes |
| Distributor | Authorized seller for one or more manufacturer product lines; receives routed customer requests |
| Database Administrator | Maintain vendor, brand, catalog, spec, and distributor authorization data; enforce data integrity |

## Core Workflow

### Customer-Initiated
1. Customer visits public portal and selects a product category
2. Platform guides customer through plain-language spec questions
3. Customer reviews and confirms their spec values
4. Platform returns ranked product matches with spec delta explanations
5. Customer selects an authorized distributor and submits a structured RFQ
6. Distributor receives the request and responds to the customer

### Sales-Rep-Initiated
1. Sales rep selects a product type in the app
2. App generates a spec requirements document
3. Document is shared with the customer
4. Customer returns spec values
5. Sales rep enters values into the app
6. App returns ranked candidate matches with vendor priority applied

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript — hosted on GitHub Pages (`andredavisme/parts-spec-matcher`, `gh-pages` branch)
- **Backend / Database:** Supabase (PostgreSQL) — schema `parts_matcher` on project `andredavisme's Project`
- **Auth:** Supabase Auth — email/password for sales reps; JWT `app_metadata` claim for admin access
- **Match Engine:** PostgreSQL function `parts_matcher.run_match(p_request_id)` invoked via Supabase RPC
- **Repository:** [andredavisme/parts-spec-matcher](https://github.com/andredavisme/parts-spec-matcher)

## Documentation Index

- [`docs/product-objective.md`](docs/product-objective.md) — Business problem, scope, success criteria
- [`docs/end-user-experience.md`](docs/end-user-experience.md) — End user role, customer-initiated workflow, design principles, new data entities
- [`docs/data-architecture.md`](docs/data-architecture.md) — Schema design, catalog ingestion, vendor priority logic, match engine
- [`docs/quote-workflow.md`](docs/quote-workflow.md) — End-to-end quote workflow with conveyor roller example
- [`docs/rfq-collaboration-brief.md`](docs/rfq-collaboration-brief.md) — Plain-language project overview for RFQ process collaborators
- [`docs/progress-tracker.md`](docs/progress-tracker.md) — Milestone log, dependencies, errors/fixes, and next steps
- [`docs/build-guide.md`](docs/build-guide.md) — Reusable methodology reference for building with Perplexity + Supabase + GitHub
