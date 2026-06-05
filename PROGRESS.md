# Parts Spec Matcher — Progress Tracker

> Last updated: 2026-06-05

---

## Legend
- ✅ Done
- 🔄 In progress / partial
- ⬜ Not started

---

## Phase 1 — Foundation

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Supabase project + schema (`parts_matcher`) | ✅ | Base tables: `part_requests`, `request_spec_values`, `spec_match_results`, ref tables |
| 1.2 | `run_match()` RPC (SECURITY DEFINER) | ✅ | Scores catalog items against spec values |
| 1.3 | Auth helpers (`is_admin`, `is_sales` in `parts_matcher`) | ✅ | Used by existing parts_matcher policies |
| 1.4 | `pm_*` public views over `parts_matcher` tables | ✅ | All 19 views expose schema to JS client |
| 1.5 | Existing RLS on `parts_matcher` base tables | ✅ | Session-based policies for sales/admin |

---

## Phase 2 — Admin / Sales Rep App

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | `index.html` — admin SPA shell (5 views) | ✅ | login, dashboard, selector, request, results |
| 2.2 | `js/auth.js` — signIn / signOut / getSession | ✅ | |
| 2.3 | `js/config.js` — Supabase client init | ✅ | |
| 2.4 | `js/selector.js` — product type picker | ✅ | |
| 2.5 | `js/request.js` — spec intake form builder | ✅ | Inserts `pm_part_requests` + `pm_request_spec_values`, calls `run_match()` |
| 2.6 | `js/results.js` — match results renderer | ✅ | 6-col table, delta notes, score badge |
| 2.7 | `js/dashboard.js` — admin request list | ✅ | All requests, status filter, re-run match |
| 2.8 | `css/styles.css` — admin theme (navy) | ✅ | |

---

## Phase 3 — Customer Portal

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | `customer.html` — customer SPA shell (5 views) | ✅ | login, dashboard, selector, request, results |
| 3.2 | `js/customer-app.js` — routing + login + overrides | ✅ | Wraps `initRequestForm`; sets `initiated_by='customer'` + `customer_email` |
| 3.3 | `js/customer-dashboard.js` — customer request list | ✅ | Filters by `initiated_by='customer'` + `customer_email` |
| 3.4 | `css/customer.css` — customer theme (teal) | ✅ | Print styles included |
| 3.5 | `parts_matcher.part_requests` — add `customer_email` + `initiated_by` columns | ✅ | Migration: `add_customer_email_initiated_by_and_rls` |
| 3.6 | `pm_part_requests` view updated with new columns | ✅ | Dropped + recreated |
| 3.7 | `pm_is_admin()` / `pm_is_sales()` helper functions | ✅ | Read `app_metadata.pm_role` from JWT |
| 3.8 | Customer RLS policies (5 policies) | ✅ | INSERT + SELECT on `part_requests`, `request_spec_values`, `spec_match_results` |

---

## Phase 4 — Role Management

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Set `app_metadata.pm_role` for existing users | ⬜ | Needed for `pm_is_admin()` / `pm_is_sales()` to work for staff |
| 4.2 | Admin SDK snippet to bulk-set roles | ⬜ | e.g. Node script using `supabase.auth.admin.updateUserById()` |
| 4.3 | Role-gate `customer.html` (redirect non-customers) | ⬜ | Optional; enforce via RLS already |

---

## Phase 5 — Polish & Testing

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | End-to-end test: customer portal full flow | ⬜ | login → selector → request → results → dashboard |
| 5.2 | End-to-end test: sales rep full flow | ⬜ | |
| 5.3 | Verify RLS isolation (customer A can't see customer B's requests) | ⬜ | |
| 5.4 | Print / Save PDF test on results view | ⬜ | |
| 5.5 | Mobile responsiveness review | ⬜ | |
| 5.6 | Performance: index on `part_requests(customer_email, initiated_by)` | ⬜ | Speeds up RLS subquery scans |

---

## Open Items / Decisions Needed

| Item | Detail |
|------|--------|
| **Bulk role assignment** | Run admin SDK script to set `pm_role` on all existing staff users |
| **Customer sign-up flow** | Currently customers must be manually created in Supabase Auth; self-signup not wired |
| **`customer_ref` field** | Optional PO/reference number on customer requests — confirm field label with stakeholders |
| **Vendor priority column** | Hidden from customer results view by design — confirm this is correct |
| **`run_match()` SECURITY DEFINER** | Already bypasses RLS for result INSERT; confirm no unintended data leakage via RPC response |
