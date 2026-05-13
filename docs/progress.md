# parts-spec-matcher — Project Progress

## Milestones

| # | Milestone | Status |
|---|-----------|--------|
| 0 | Project Initialization | ✅ Complete |
| 1 | Database Schema Creation | ✅ Complete |
| 2 | Seed Data & Catalog Entry | ✅ Complete |
| 3 | Quote Template Builder | ✅ Complete |
| 4 | Match Query Engine | ✅ Complete |
| 5 | Frontend Interface | ✅ Complete |
| 6 | Admin / DBA Tooling | ✅ Complete |
| 7 | Role-Based Access Design | ✅ Complete |
| 8 | Role-Based Access Implementation | 🚧 In Progress |

---

## Milestone 8 — Role-Based Access Implementation

### Completed (May 13, 2026)

- `parts_matcher_get_role_helper` migration applied — added `get_role()`, `is_sales()`, updated `is_admin()` to use `app_maintenance` claim
- `dev@chronicle.local` auth claim updated from `admin` → `app_maintenance`
- `parts_matcher_role_based_rls` migration applied — dropped duplicate SELECT policies, replaced broad authenticated workflow policies with role-specific ones
- `js/app.js` updated on `gh-pages` — `maybeShowAdminBtns()` now checks `parts_matcher_role === 'app_maintenance'`
- `docs/build-guide.md` updated on `main` — new Role-Based Access Pattern section with correct SQL snippets, role table, and updated frontend snippet

### Pending

- **Create initial user accounts** in Supabase Auth dashboard (blocked — Supabase access unavailable):
  - `insidesales@chronicle.local` → role: `inside_sales`
  - `outsidesales@chronicle.local` → role: `outside_sales`
- **Set `parts_matcher_role` claims via SQL** once users are created:
  ```sql
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || '{"parts_matcher_role": "inside_sales"}'
  WHERE email = 'insidesales@chronicle.local';

  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data || '{"parts_matcher_role": "outside_sales"}'
  WHERE email = 'outsidesales@chronicle.local';
  ```
- Resolve `test@chroincle.local` (typo domain) — delete or assign a role
- Run **security advisor** after all policy and frontend changes are verified
- Validate quote workflow + admin screens with fresh sessions for both roles
