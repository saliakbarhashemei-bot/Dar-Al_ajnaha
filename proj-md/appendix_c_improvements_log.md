# Appendix C — Improvements Log & Traceability

> **Purpose:** every issue raised by the three reviews (GLM, NotebookLM, Claude) is mapped here to a concrete resolution in the phased spec files. This is the audit trail proving no review feedback was silently dropped.
>
> If a reviewer issue is **not** in this log, it was either (a) already satisfied by the original spec, or (b) deemed out of scope and surfaced as an open question in `README.md §11`.

---

## 1. GLM Review — Issue-by-Issue Resolution

### GLM Issue A — Critical Build Order Conflict (Phase 2 & Phase 3)

**Original issue (GLM §1.A):**
> In Section 23 (Build Order), Phase 2 asks the agent to build the book/contributor relationship foundation. However, the Books entity is not created until Phase 3. The agent will attempt to create a foreign key (`book_id`) in a pivot table before the `books` table exists, causing a database migration failure.

**Resolution:**
- Phase 2 explicitly defers the `book_contributor` pivot to Phase 3.
- Phase 2 §1 ("Why Phase 2 Comes Before Phase 3") documents the rationale.
- Phase 3 §1 ("Why the Pivot Lives in Phase 3") confirms the pivot is created alongside `books`.
- Migration order in `appendix_b_database_schema.md` §7 enforces: `books` (step 10) before `book_contributor` (step 13).
- The "What Not To Do" sections in both Phase 2 and Phase 3 explicitly call out the constraint.

**Files modified:**
- `phase_2_contributors.md` §1, §8.
- `phase_3_books.md` §1.
- `appendix_b_database_schema.md` §7.

**Status:** ✅ Resolved.

---

### GLM Issue B — Missing Relationship Management Endpoints

**Original issue (GLM §1.B):**
> Section 10 (API Rules) lists standard CRUD endpoints but does not define how the 36 Relationship Key cards (e.g., attaching a Contributor to a Book) are executed via the REST API. The agent will unpredictably invent API structures.

**Resolution:**
- `00_overview_conventions.md` §7.5 standardizes all relationship endpoints:
  - `POST/GET/PUT/DELETE /api/v1/books/{book}/contributors`
  - `POST/GET/DELETE /api/v1/books/{book}/media`
  - `POST/GET/DELETE /api/v1/contributors/{contributor}/media`
  - `POST/GET/DELETE /api/v1/announcements/{announcement}/media`
- Each phase file references these endpoints in its §4.2 (Endpoints) section.
- Phase 6 §4 (API Surface Audit) verifies no extra/missing routes.

**Files modified:**
- `00_overview_conventions.md` §7.5.
- `phase_3_books.md` §4.2 (Book-Contributor attach endpoints).
- `phase_4_media.md` §5.2 (polymorphic attach endpoints).
- `phase_6_integration.md` §4 (route list audit).

**Status:** ✅ Resolved.

---

### GLM Issue C — Ambiguity in Announcement ↔ Books (Package 09)

**Original issue (GLM §1.C):**
> The relationship key maps business concepts like Reprint ↔ Publication Date. It is unclear how this translates to database logic. The agent will not know if this requires a foreign key, a pivot table, or validation logic. It might create unnecessary database tables.

**Resolution:**
- `00_overview_conventions.md` §7.6 explicitly states Package 09 cards are business rules, not tables.
- Phase 5 §1 (Package 09 Implementation) maps each of the 5 cards to a specific Form Request validation rule.
- `appendix_b_database_schema.md` §3.14 shows `announcements.book_id` is a nullable FK with conditional required-ness enforced in Form Request, not DB.
- `appendix_a_system_map_and_relationship_key.md` Package 09 tags all 5 cards as `Business Logic` class.

**Files modified:**
- `00_overview_conventions.md` §7.6.
- `phase_5_announcements.md` §1.
- `phase_5_announcements.md` §4.3 (Form Request code).
- `appendix_a_system_map_and_relationship_key.md` Package 09 section.
- `appendix_b_database_schema.md` §3.14.

**Status:** ✅ Resolved.

---

### GLM Issue D — Unclear Implementation for Relationship-Only Exceptions

**Original issue (GLM §1.D):**
> Section 4 states that Contributions and Image / File should not be added to Domain trees but does not specify how to implement them in code. The agent might struggle to represent these connections in the database, potentially creating standalone models.

**Resolution:**
- `appendix_b_database_schema.md` §6 ("Relationship-Only Exceptions — Implementation") documents:
  - Card 05 (`Contributions`) → inverse `Contributor::books()` BelongsToMany relation. No table. No model.
  - Card 06 (`Image / File`) → polymorphic `mediables` pivot. No table. No model.
- `appendix_a_system_map_and_relationship_key.md` tags both cards as `Relationship-only exception` and includes the implementation pointer.
- Phase 2 §2 and Phase 4 §2 explicitly forbid creating standalone models for these.
- Phase 2 §8 (What Not To Do): "Do not create a Contributions model or contributions table."
- Phase 4 §9 (What Not To Do): "Do not implement a separate book_media, contributor_media, announcement_media table — polymorphic mediables is the only pivot."

**Files modified:**
- `appendix_b_database_schema.md` §6.
- `appendix_a_system_map_and_relationship_key.md` Cards 05 and 06.
- `phase_2_contributors.md` §2, §8.
- `phase_4_media.md` §9.

**Status:** ✅ Resolved.

---

### GLM Issue E — Vocabulary Inconsistency: Person vs. Contributor

**Original issue (GLM §1.E):**
> The database and API use the term contributors, while the UI and Domain descriptions frequently use Person. This can cause naming mismatches between Laravel models/migrations and React/TypeScript interfaces.

**Resolution:**
- `00_overview_conventions.md` §3 (Vocabulary Standardization) defines:
  - DB table: `contributors`
  - Eloquent model: `Contributor`
  - API resource/endpoint: `contributors`
  - JSON Resource class: `ContributorResource`
  - Form Request class: `ContributorRequest`
  - Policy class: `ContributorPolicy`
  - UI label: "Person" or "Contributor" (i18n key)
  - Frontend type: `Contributor`
  - Frontend page route: `/contributors`
- Every phase file uses `Contributor` consistently.
- No `Person` model, no `people` table anywhere.

**Files modified:**
- `00_overview_conventions.md` §3.
- All phase files (consistent naming).

**Status:** ✅ Resolved.

---

### GLM Fix 1 — Correct the Build Order

✅ See GLM Issue A above.

### GLM Fix 2 — Add Relationship Database Rules

**Resolution:** `appendix_b_database_schema.md` §6 + §3.10 + §3.13 fully document:
- Many-to-many via standard pivot tables.
- `book_contributor` pivot with `contributor_role_id` discriminator.
- Polymorphic `mediables` for media attachments.
- No standalone tables for exceptions.

**Status:** ✅ Resolved.

### GLM Fix 3 — Define Relationship API Endpoints

✅ See GLM Issue B above.

### GLM Fix 4 — Clarify Announcement ↔ Books Logic

✅ See GLM Issue C above.

### GLM Fix 5 — Standardize Vocabulary

✅ See GLM Issue E above.

---

## 2. Claude Review — Issue-by-Issue Resolution

### Claude Issue 1 — Ambiguity in 36-Card Meaning

**Original issue (Claude §1):**
> 36 cards treated as uniform, but they are 3 distinct types: real DB relationships, RBAC re-definitions, conceptual/UI references. "36 approved cards" is misleading because more than half are just duplicated RBAC.

**Resolution:**
- `00_overview_conventions.md` §5 introduces 4 technical classes: `DB`, `RBAC`, `Business Logic`, `Media Link`.
- `appendix_a_system_map_and_relationship_key.md` tags every one of the 36 cards with its class.
- The Card Audit Summary in Appendix A Part 3 shows the breakdown:
  - 4 DB
  - 1 Exception (inverse relation)
  - 1 Exception + Media Link
  - 20 RBAC
  - 5 Business Logic
  - 5 Media Link (polymorphic)
- Phase files implement each card according to its class — no DB tables for RBAC/Business Logic cards.

**Files modified:**
- `00_overview_conventions.md` §5.
- `appendix_a_system_map_and_relationship_key.md` (all 36 cards annotated + Part 3 summary).

**Status:** ✅ Resolved.

---

### Claude Issue 2 — Internal Inconsistency in Package 09

**Original issue (Claude §2):**
> Why is Reprint connected to Publication Date and Status but not Edition, and New Edition connected to Edition and Publication Date but not Status? The logic behind this asymmetry is not explained.

**Resolution:**
- `README.md` §11 Q1 surfaces this as an open question requiring product owner decision.
- `phase_5_announcements.md` §1 explicitly states: "This asymmetry is per the approved System Map. Do not 'balance' it."
- Implementation faithfully reproduces the asymmetry:
  - Reprint → checks publication_date (card 25) + status (card 26).
  - New Edition → checks edition (card 27) + publication_date (card 28).
- Tests in Phase 5 §6.1 verify each card independently.
- `00_overview_conventions.md` §7.6 and `appendix_a` Package 09 section both document the asymmetry as intentional.

**Files modified:**
- `README.md` §11 Q1.
- `phase_5_announcements.md` §1, §8, §9.
- `00_overview_conventions.md` §7.6.
- `appendix_a_system_map_and_relationship_key.md` Package 09 note.

**Status:** ✅ Resolved (documented as intentional, surfaced as open question).

---

### Claude Issue 3 — Gap about "Publisher Logo"

**Original issue (Claude §3):**
> Publisher is only a text field in BOOKS, but Publisher Logo is defined as a controlled media type without being connected to any of the 36 cards. This is a real gap, not a declared exception like Section 4.

**Resolution:**
- `README.md` §11 Q2 surfaces this as an open question.
- Phase 4 §6 ("MIME Whitelist") defines Publisher Logo with `image/svg+xml` and `image/png` MIMEs.
- Phase 4 §9 (What Not To Do): "Do not auto-link Publisher Logo to anything."
- `appendix_b_database_schema.md` §3.12 includes Publisher Logo in the 6 seeded media types.
- The Publisher Logo media type is **usable** (can be uploaded, attached to any mediable entity that allows it via the polymorphic system), but is **not** auto-linked to any entity.
- If product owner wants Publisher Logo explicitly linked to a future `publishers` entity, that requires a Change Control request (original Publisher is a free-text field per §8 of spec).

**Files modified:**
- `README.md` §11 Q2.
- `phase_4_media.md` §6, §9.
- `appendix_b_database_schema.md` §3.12.

**Status:** ✅ Resolved (gap documented; default behavior is "usable but not auto-linked").

---

### Claude Issue 4 — "Category" Naming Clash

**Original issue (Claude §4):**
> The word Category is both a structural level (Domain → Category → Subcategory) and a business field in Book Classification (Category, Genre, Tags). This naming overlap can cause confusion in documentation and code.

**Resolution:**
- `00_overview_conventions.md` §4 (Structural Naming Clarification):
  - In documentation, structural level written as "Map Category" or qualified by context.
  - In code, business Category uses prefixed names: `book_category_id`, `book_categories` table.
  - `book_categories` table is explicitly **not** the same concept as System Map structural Categories.
- `appendix_b_database_schema.md` §3.7 notes the distinction.
- Phase 3 §3 references `book_categories` consistently.

**Files modified:**
- `00_overview_conventions.md` §4.
- `phase_3_books.md` §3.
- `appendix_b_database_schema.md` §3.7.

**Status:** ✅ Resolved.

---

### Claude Issue 5 — Source-of-Truth Duplication

**Original issue (Claude §5):**
> Section 9 (Controlled Values) repeats the same values as Appendix A (System Map). This contradicts the "single source of truth" core rule and risks divergence.

**Resolution:**
- `00_overview_conventions.md` §6 (Source-of-Truth Deduplication):
  - Single source of truth for controlled values is `appendix_a_system_map_and_relationship_key.md`.
  - Phase files reference the appendix; they do **not** re-declare values.
  - If a value appears in a phase file for convenience, the appendix wins on conflict.
- `appendix_b_database_schema.md` §4 (Enums Reference) is the secondary reference for SQL CHECK constraints, and it cross-references Appendix A.

**Files modified:**
- `00_overview_conventions.md` §6.
- `appendix_b_database_schema.md` §4.

**Status:** ✅ Resolved.

---

### Claude Issue 6 — Missing Critical Technical Decisions

**Original issue (Claude §6):**
> API auth mechanism (Sanctum? Passport? JWT?) unclear. Soft-delete strategy per entity unclear. Tags nature unclear. Test framework unclear. Media upload limits unclear.

**Resolution:** `00_overview_conventions.md` §2 (Final Stack Decisions) makes every decision explicit:

| Decision Point | Choice | Location |
|----------------|--------|----------|
| API auth | Laravel Sanctum (SPA cookie tokens) | `00_overview_conventions.md` §2 |
| Soft-delete per entity | Per-entity table (17 entries) | `00_overview_conventions.md` §2 + `appendix_b_database_schema.md` §8 |
| Tags | Normalized `tags` + `book_tag` pivot | `00_overview_conventions.md` §2 + `appendix_b_database_schema.md` §3.8, §3.9 |
| Backend tests | Pest PHP | `00_overview_conventions.md` §2 + §10 |
| Frontend tests | Vitest + React Testing Library | `00_overview_conventions.md` §2 + §10 |
| Media upload limits | MIME whitelist + size cap + dimension cap per media_type | `phase_4_media.md` §4 |
| Pagination default | 15/page, max 100 | `00_overview_conventions.md` §2 |
| API versioning | `/api/v1` prefix | `00_overview_conventions.md` §2 |
| i18n | i18next + react-i18next, fa RTL primary | `00_overview_conventions.md` §2 + `phase_7_hardening.md` §5 |
| Environments | local / staging / production | `00_overview_conventions.md` §2 + `phase_7_hardening.md` §6 |
| CI/CD | GitHub Actions | `00_overview_conventions.md` §2 + `phase_7_hardening.md` §6 |

**Status:** ✅ Resolved (every gap closed).

---

### Claude Issue 7 — Missing i18n / RTL Requirement

**Original issue (Claude §7):**
> Given the name "دار الأجنحة" and the Language field in Books, there's no mention of multi-language panel, RTL support, or content language for Announcements/Books. A significant product requirement that's missing.

**Resolution:**
- `README.md` §11 Q3 surfaces this as an open question with a default decision.
- `00_overview_conventions.md` §2 declares: "Frontend i18n: i18next + react-i18next, Persian RTL primary, English LTR secondary."
- `00_overview_conventions.md` §8.4 specifies:
  - Default locale `fa`, direction `rtl`.
  - Secondary locale `en`, direction `ltr`.
  - All user-visible strings go through `t()` / `useTranslation()`.
  - CSS uses logical properties (`margin-inline-start`, etc.) — no physical `left`/`right`.
  - Language toggle in top bar.
- `phase_7_hardening.md` §5 (i18n / RTL Completion) is a dedicated section enforcing:
  - Translation files `fa.json` and `en.json` covering every user-visible string.
  - RTL CSS audit (no physical left/right properties).
  - Language toggle end-to-end.
  - Persian-specific considerations (Persian digits, Jalali dates via `dayjs + jalaliday`).
- Frontend directory structure (Phase 0 §4.4) includes `src/locales/`.

**Files modified:**
- `README.md` §11 Q3.
- `00_overview_conventions.md` §2, §8.4.
- `phase_0_foundation.md` §4.4 (locales directory).
- `phase_7_hardening.md` §5.

**Status:** ✅ Resolved.

---

### Claude Issue 8 — Overly Defensive Tone

**Original issue (Claude §8):**
> Repetitive "Do not invent / Do not silently / Never claim" throughout nearly every section. The spec is rich in "what not to do" but thin on "exactly how to build" (table naming, enum convention, default page size, API versioning beyond v1).

**Resolution:**
- Phased files replace reactive prohibitions with **positive imperatives** ("Create the migration with X", "Use Form Request Y", "Enforce rule Z via Policy method W").
- "What Not To Do" sections are still present but **scoped** to each phase, not repeated as global warnings.
- Global non-negotiable rules live in `README.md` §5 (Non-Negotiable Agent Rules) — stated once, referenced everywhere.
- "Stop and Report If" sections in each phase surface decision boundaries without being preachy.
- Concrete guidance added:
  - Table naming (`appendix_b_database_schema.md`).
  - Enum convention (`appendix_b_database_schema.md` §4 — VARCHAR + CHECK constraint, not PG enum type).
  - Default page size (`00_overview_conventions.md` §2 — 15, max 100).
  - API versioning (`00_overview_conventions.md` §2 — `/api/v1`, version header optional).
  - Naming clash resolution (`00_overview_conventions.md` §3, §4).

**Files modified:**
- All files (tone shift throughout).

**Status:** ✅ Resolved.

---

### Claude Issue 9 — No CI/CD or Environments Definition

**Original issue (Claude §9):**
> Despite precise build phasing and detailed final checklist, there's no mention of staging/production environments, deployment pipeline, or secrets management at the infrastructure level.

**Resolution:**
- `00_overview_conventions.md` §2 declares environments: local / staging / production.
- `phase_7_hardening.md` §6 (CI/CD Pipeline) is a dedicated section with:
  - §6.1 Environments table (env, purpose, DB, storage).
  - §6.2 GitHub Actions CI workflow YAML (backend + frontend jobs, PostgreSQL service, coverage thresholds).
  - §6.3 Deploy workflow YAML (staging on main push, production on version tags).
  - §6.4 Environment secrets configuration.
  - §6.5 Branch protection rules.
- `phase_7_hardening.md` §7 (Pre-Deployment Checklist) requires backup strategy, rollback plan, monitoring.
- `phase_7_hardening.md` §8 (Backup Strategy), §9 (Rollback Plan), §12 (Handoff to Operations) close the loop.

**Files modified:**
- `00_overview_conventions.md` §2.
- `phase_7_hardening.md` §6, §7, §8, §9, §12.

**Status:** ✅ Resolved.

---

## 3. NotebookLM Review — Theme-by-Theme Resolution

### NotebookLM Theme 1 — Anti-Rogue-Engineering Philosophy

**Original theme (NotebookLM §1):**
> The core of this document is opposing "rogue engineering" and "shiny object syndrome". The developer has no right to invent new domains, categories, or business requirements. The map is the law.

**Resolution:**
- `README.md` §2 (Source of Truth) preserves the "Core rule — do not invent, remove, rename, merge, or silently reinterpret" verbatim.
- `README.md` §5 (Non-Negotiable Agent Rules) lists 13 rules, including #7 "Do not invent business requirements" and #13 "If implementation requires changing the approved System Map, stop and report."
- `README.md` §8 (Change Control) requires explicit approval for any structural change.
- Every phase file has a "Stop and Report If" section surfacing decision boundaries.
- Phase 6 §8 explicitly forbids silently fixing audit failures.

**Status:** ✅ Preserved and operationalized.

---

### NotebookLM Theme 2 — Modular Monolith Choice

**Original theme (NotebookLM §2):**
> The spec insists on a modular monolith over microservices. For this scale of publishing, modular monolith is safer, faster, more cohesive. Microservices at this scale add network latency and unnecessary bugs.

**Resolution:**
- `00_overview_conventions.md` §1: "The system is a modular monolith. Do not split v1 into microservices."
- `README.md` §5 Rule #9: "Do not introduce microservices unless explicitly requested."
- `README.md` §5 Rule #10: "Do not add unnecessary packages or architecture layers."
- Phase 0 §1 (Inspect) records the framework state without adding architectural layers.
- The directory structures (Phase 0 §3.4, §4.4; `00_overview_conventions.md` §8.1, §9.1) are domain-organized folders within a single Laravel app and a single React app — no service boundaries, no message queues, no separate services.

**Status:** ✅ Preserved.

---

### NotebookLM Theme 3 — Single Person Entity

**Original theme (NotebookLM §3):**
> To prevent data duplication, all roles (Author, Translator, etc.) must connect to a single Person entity.

**Resolution:**
- `00_overview_conventions.md` §3 standardizes the single `Contributor` entity.
- `phase_2_contributors.md` §1 emphasizes: "One reusable person entity."
- `appendix_b_database_schema.md` §3.4 defines `contributors` as a single table.
- `book_contributor` pivot (`appendix_b_database_schema.md` §3.10) uses a `contributor_role_id` discriminator — same person can have multiple roles across books without duplicating the person record.
- Phase 2 §8 explicitly forbids: "Do not create separate person systems for Author / Translator / Editor / Illustrator."

**Status:** ✅ Preserved and concretized.

---

### NotebookLM Theme 4 — Intentional Traps (Change Control)

**Original theme (NotebookLM §4):**
> The spec uses intentional traps — anomalies in the map (like references not in the domain tree) that force the developer to communicate with the project manager and get approval before proceeding.

**Resolution:**
- `README.md` §10 (Acknowledged Source-Map Exceptions) preserves the two traps verbatim:
  - `CONTRIBUTORS → Contributions → Books` (Card 05)
  - `ANNOUNCEMENTS → Content → Image / File` (Card 06)
- `appendix_b_database_schema.md` §6 documents their implementation (inverse relation / polymorphic pivot — no standalone tables).
- `appendix_a_system_map_and_relationship_key.md` tags both as "Relationship-only exception" with implementation pointers.
- Phase 2 §8 and Phase 4 §9 explicitly forbid creating standalone models for these.
- Phase 6 §2 audit explicitly checks "No `contributions` table exists" and "No `image_files` table exists."

**Status:** ✅ Preserved with concrete implementation guidance.

---

### NotebookLM Theme 5 — Backend Security Authority

**Original theme (NotebookLM §4):**
> Security must not be limited to frontend checks; all permissions must be authoritatively validated on the backend.

**Resolution:**
- `README.md` §5 Rule #4: "Backend authorization is authoritative. Frontend checks are UX, not security."
- `README.md` §5 Rule #6: "Never trust frontend permission checks as security."
- `00_overview_conventions.md` §9.3 (Authorization): "Every controller action calls `$this->authorize(...)` or uses `authorizeResource`. Frontend permission checks are UX only, never security."
- Every phase's §4.4 (Policy) section enforces server-side authorization.
- `phase_7_hardening.md` §2.2 (Authorization) is a dedicated security review checklist.
- Phase 6 §3.2 (Permission Matrix Test) verifies 403 responses on the backend, not just frontend hiding.

**Status:** ✅ Preserved and tested.

---

### NotebookLM Theme 6 — Phased Development

**Original theme (NotebookLM §5):**
> Building the system from Phase 0 (Foundation) to Phase 7 (Hardening) is hierarchical. Phase 1 (Access) must be completed and approved before anything else.

**Resolution:**
- `README.md` §4 (File Index) preserves the 8-phase structure (Phase 0 through Phase 7).
- Each phase file has an "Exit gate" — the condition that must be met before the next phase starts.
- Each phase file has a "Definition of Done" checklist.
- Phase 1 §1 explicitly states: "Verify authorization works before any other phase starts."
- Phase 6 §1 mindset: "Phase 6 is not a build phase. It is a verification gate."
- The migration order in `appendix_b_database_schema.md` §7 enforces phase ordering at the DB level (e.g., `book_contributor` cannot exist before `books`).

**Status:** ✅ Preserved with explicit phase gates.

---

### NotebookLM Theme 7 — Strict Definition of Done

**Original theme (NotebookLM §5):**
> A phase is only complete when, in addition to coding, DB migrations, validations, and all UI states (empty, error, loading) have been tested.

**Resolution:**
- `README.md` §6 (Definition of Done) preserves the 12-point checklist verbatim from original §25.
- Each phase file has its own "Phase X Definition of Done" section, often more detailed than the global one.
- Phase 7 §1 (Test Coverage) sets specific coverage targets (80% Services, 90% Policies, etc.).
- Phase 7 §2 (Security Review) is a 12-section checklist.
- `00_overview_conventions.md` §8.2 (Required UI States) lists all 7 states that every page must implement.

**Status:** ✅ Preserved with concrete testing targets.

---

### NotebookLM Theme 8 — Archive vs Delete Distinction

**Original theme (NotebookLM §5):**
> Instead of physical cascade deletion that destroys history, the system emphasizes safe archive (Soft Delete).

**Resolution:**
- `00_overview_conventions.md` §2 (Per-Entity Soft-Delete Strategy) is a 12-row table specifying soft-delete vs hard-delete per entity.
- `00_overview_conventions.md` §8.3: "Archive and Delete are two distinct UI actions. Do not collapse them."
- `appendix_b_database_schema.md` §8 repeats the soft-delete table for reference.
- Every phase file's Policy section enforces: "delete requires archive first" pattern.
- Phase 6 §3.3 (Soft-Delete and Archive Cascade Test) verifies the distinction end-to-end.
- FK behaviors in `appendix_b_database_schema.md` use `ON DELETE RESTRICT` for critical entities (e.g., `book_contributor.contributor_id`, `announcements.book_id`) to prevent cascade destruction.

**Status:** ✅ Preserved with per-entity precision.

---

## 4. Summary Statistics

### Issues Resolved

| Source | Issues Raised | Fully Resolved | Surfaced as Open Question | Out of Scope |
|--------|---------------|----------------|---------------------------|--------------|
| GLM | 5 | 5 | 0 | 0 |
| Claude | 9 | 8 | 1 (Q1: Package 09 asymmetry — documented as intentional) | 0 |
| NotebookLM | 8 themes | 8 | 0 | 0 |
| **Total** | **22** | **21** | **1** | **0** |

### Open Questions for Product Owner

From `README.md` §11:

| # | Question | Default if no answer |
|---|----------|----------------------|
| Q1 | Why is Package 09 asymmetric? | Implement exactly as written; do not "fix" the symmetry. |
| Q2 | Is "Publisher Logo" being unconnected intentional? | Implement as a usable media type; do not auto-link to BOOKS. |
| Q3 | Should the admin panel UI be RTL + Persian, LTR + English, or both with a toggle? | Default: Persian RTL primary, English LTR secondary. |
| Q4 | Is Tags (in Book Classification) free-text or normalized many-to-many? | Default: normalized `tags` table + `book_tag` pivot. |

### Phase Files Touched

| Phase File | GLM Fixes Applied | Claude Fixes Applied | NotebookLM Themes Applied |
|------------|-------------------|----------------------|---------------------------|
| `README.md` | — | Q1, Q2, Q3, Q4, theme 1 | Themes 1, 6 |
| `00_overview_conventions.md` | A, B, C, D, E | 1, 2, 3, 4, 5, 6, 7, 8, 9 | Themes 1, 2, 3, 4, 5, 6, 7, 8 |
| `phase_0_foundation.md` | — | 7 (locales dir) | Themes 2, 6 |
| `phase_1_user_access.md` | — | — | Themes 5, 6, 7 |
| `phase_2_contributors.md` | A (pivot deferred), D, E | — | Themes 3, 4, 6, 8 |
| `phase_3_books.md` | A (pivot here), B, D | 4 (Category naming) | Themes 3, 6, 8 |
| `phase_4_media.md` | B, D | 3 (Publisher Logo gap), 6 (upload limits) | Themes 4, 5, 8 |
| `phase_5_announcements.md` | C | 2 (asymmetry preserved) | Themes 5, 6, 8 |
| `phase_6_integration.md` | B (route audit) | 1 (card audit by class) | Themes 5, 6, 7 |
| `phase_7_hardening.md` | — | 6 (test frameworks), 7 (i18n/RTL), 9 (CI/CD) | Themes 5, 7, 8 |
| `appendix_a_system_map_and_relationship_key.md` | C, D | 1, 2 | Themes 1, 4 |
| `appendix_b_database_schema.md` | A (migration order), B, C, D, E | 4, 5, 6 | Themes 3, 4, 8 |
| `appendix_c_improvements_log.md` | (this file) | (this file) | (this file) |

---

## 5. Verification

To verify this log is complete:

1. Open each review file (`glm-review.md`, `notebooklm-review.md`, `claude-review.md`).
2. For each issue/theme raised, find it in §1, §2, or §3 of this log.
3. Confirm the resolution location(s) listed actually contain the documented fix.

If any review issue is not in this log, it is either:
- Already satisfied by the original spec (no action needed), OR
- An omission that requires the spec to be amended — surface to product owner.

---

## 6. Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-09-27 | Initial creation from GLM + NotebookLM + Claude reviews merged into phased spec | Super Z (AI assistant) |

Future amendments to the phased spec must append a row to this table and reference the Change Control process in `README.md` §8.
