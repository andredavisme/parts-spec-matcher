# Build Guide: Web App Development with Perplexity, Supabase & GitHub

This document serves as a reusable educational reference for the process used to scaffold, document, and build this application. It captures the methodology so that it can be repeated for future projects or taught to others.

---

## The Process

This project was built using a three-platform workflow:

| Platform | Role |
|---|---|
| **Perplexity** | AI assistant — architecture decisions, documentation generation, code generation, schema design, debugging |
| **Supabase** | Backend — PostgreSQL database, authentication, edge functions, API layer |
| **GitHub** | Version control — repository, documentation, code, and progress tracking |

---

## Step-by-Step Setup

### Step 1 — Create a Perplexity Space
- Create a new Space in Perplexity
- Spaces allow you to maintain persistent context across conversations for a single project
- Name the Space after the project so conversations stay organized

### Step 2 — Connect a Supabase Account
- Link your Supabase account to Perplexity via the Supabase MCP integration
- This gives Perplexity direct access to list projects, apply migrations, execute SQL, manage edge functions, and run advisors
- Identify which Supabase project will be used and confirm the project ID
- If the project is shared with other schemas, confirm the isolated schema name to be used (e.g., `parts_matcher`)

### Step 3 — Connect a GitHub Account
- Link your GitHub account to Perplexity via the GitHub MCP integration
- This gives Perplexity direct access to create repositories, push files, manage branches, and track issues
- Confirm the GitHub username so the correct account is targeted

### Step 4 — Write the Setup Prompt

The setup prompt is the single most important input. It defines everything Perplexity needs to scaffold the project. It should contain four sections:

---

#### Section 1: The Idea

Describe what the app does in plain language. Include:
- Who the business is
- What problem is being solved
- What the app will allow users to do
- Any relevant external references (e.g., product catalog URLs)

**Example:**
```
We're going to build an app for an industrial machine parts distributor. We sell the categories 
of products shown at https://www.easternia.com/products. The app will allow users to reference 
part spec requirements for types of products (dimensions, ratings, etc as appropriate to the 
product). Users will also be able to enter spec information to generate potential item matches.
```

---

#### Section 2: The User Story

Describe the core workflow from the perspective of a real user. Walk through a specific scenario end-to-end. Include:
- Who the user is (role)
- What triggers the workflow
- Each action the user takes
- What the system returns
- Any backend roles (e.g., database administrator)
- The stated objective (the "why")

**Example:**
```
Consider the platform story from a sales representative's perspective who is responding to a 
customer request for a conveyor roller. The customer wants to know what information they need 
to provide. The sales representative uses the app to generate a document that shows what is 
needed to appropriately quote a conveyor roller. The customer responds with the information. 
The sales representative enters the values into the app and the app returns potential matches. 
All data references are stored in a backend database maintained by a database administrator 
through appropriate tools to ensure data integrity. Data will originally be sourced from 
public-facing catalogs supplied by the brands we supply. The database will be a repository 
for vendor relationships to consider priority selection when multiple brands offer a similar 
product. The objective is to reduce the redundant effort of researching multiple locations 
for quote information that can be consolidated and more easily processed.
```

---

#### Section 3: Repo & Supabase Targets

Tell Perplexity exactly where to build:
- Whether to create a new GitHub repo or use an existing one
- The repo name and visibility (public/private)
- Which Supabase project to use (by name or ID)
- The schema name to isolate this project's data

**Example:**
```
Create a new private GitHub repo under andredavisme. Use the andredavisme's Project in 
Supabase to create the schema. Keep this schema separate from the others.
```

---

#### Section 4: Progress Update Document

Request a living milestone tracker be included in the repo. Specify:
- That it is a living document updated throughout development
- What each milestone entry must contain
- Who the audience is (developer handoff, chunked work sessions)

**Example:**
```
Include a progress update document in the repo where we will record milestones and track 
development. Each milestone will reference the work previously done, dependencies for 
progression, the work completed with the errors and fixes that were implemented during 
development of the milestone, and the next steps in development. A developer will be able 
to reference this so that they can work in chunks or hand off progression.
```

---

## What Perplexity Produces

From a well-formed setup prompt, Perplexity will:

1. Fetch any referenced URLs for context (product catalogs, existing sites, etc.)
2. Identify the correct Supabase project and confirm its ID
3. Identify the GitHub account and create or target the specified repository
4. Push a full documentation suite to the repo in a single commit:
   - `README.md` — project overview, user roles, workflow, tech stack, doc index
   - `docs/product-objective.md` — business problem, scope, success criteria
   - `docs/data-architecture.md` — schema design, entities, vendor logic, integrity rules
   - `docs/quote-workflow.md` — end-to-end workflow with a worked example
   - `docs/progress-tracker.md` — living milestone log with full handoff structure
   - `docs/build-guide.md` — this document
5. Record Milestone 0 (Project Initialization) as complete in the progress tracker
6. Define all forward milestones with dependencies and next steps

---

## Milestone Structure Reference

Every milestone in `docs/progress-tracker.md` follows this structure:

```markdown
## Milestone N — [Name]
**Status:** [✅ Complete | 🔲 Not Started | 🔄 In Progress]
**Date:** [YYYY-MM-DD when started or completed]

### Prior Work
What was already in place before this milestone began. 
References the previous milestone or initial state.

### Dependencies
What must exist, be confirmed, or be decided before work on 
this milestone can begin. Specific — not generic.

### Work Completed
Detailed record of every action taken during this milestone.
Written as it happens, not reconstructed afterward.

### Errors & Fixes
Specific problems encountered and exactly how they were resolved.
Includes tool errors, schema conflicts, logic issues, etc.
If none: write "None encountered."

### Next Steps → Milestone N+1
The defined handoff point. Specific enough that a new developer 
can pick up without asking questions.
```

---

## Why This Works

- **Perplexity** maintains project context across sessions within a Space, reducing re-explanation overhead
- **MCP integrations** allow Perplexity to act directly on Supabase and GitHub — no copy-paste, no manual steps
- **Documentation-first** approach means the project is always in a legible, transferable state
- **The progress tracker** functions as a technical changelog and onboarding document simultaneously
- **Milestone structure** enforces dependency awareness and prevents skipped steps

---

## Reusing This Process for a New Project

1. Open Perplexity and create a new Space named for the project
2. Confirm Supabase and GitHub MCP connections are active
3. Write a setup prompt using the four sections above
4. Review the generated documentation before proceeding to schema creation
5. Proceed milestone by milestone, updating `progress-tracker.md` as each one completes
