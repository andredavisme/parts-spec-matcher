# Parts Spec Matcher

An internal tool for industrial machine parts distributors to consolidate product specification requirements, vendor catalog data, and quote-matching logic into a single platform.

## Business Objective

Reduce the redundant effort of researching multiple catalog sources to respond to customer quote requests. Sales representatives can generate a spec requirements document for any product type, capture customer-supplied values, and receive a ranked list of potential item matches from the database.

## User Roles

| Role | Responsibilities |
|---|---|
| Sales Representative | Generate spec requirement docs, enter customer values, review match results |
| Customer | Receive requirements doc, supply spec values |
| Database Administrator | Maintain vendor, brand, catalog, and spec data; enforce data integrity |

## Core Workflow

1. Sales rep selects a product type (e.g., Conveyor Roller)
2. App generates a requirements document listing all needed spec fields
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
- [`docs/data-architecture.md`](docs/data-architecture.md) — Schema design, catalog ingestion, vendor priority logic, match engine
- [`docs/quote-workflow.md`](docs/quote-workflow.md) — End-to-end quote workflow with conveyor roller example
- [`docs/progress-tracker.md`](docs/progress-tracker.md) — Milestone log, dependencies, errors/fixes, and next steps
- [`docs/build-guide.md`](docs/build-guide.md) — Reusable methodology reference for building with Perplexity + Supabase + GitHub
