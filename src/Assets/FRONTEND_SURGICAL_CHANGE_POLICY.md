# FRONTEND CHANGE DISCIPLINE — SURGICAL EDIT POLICY

## PURPOSE

This is a mandatory operating policy for any AI coding agent modifying this frontend repository.

CORE RULE:

> WHEN THE USER REQUESTS ONE SPECIFIC CHANGE, MAKE ONLY THAT CHANGE AND THE MINIMUM SUPPORTING CHANGES REQUIRED FOR IT TO WORK CORRECTLY.

Do NOT use a small request as an excuse to refactor, redesign, rename, reorganize, clean up, modernize, optimize, or otherwise modify unrelated parts of the application.

The application contains working features. Preserving them is a first-class requirement.

---

# 1. SURGICAL CHANGE RULE

Every user request must be treated as a surgical patch.

Before editing, identify:

1. The exact requested behavior.
2. The exact files/components/API wrappers involved.
3. The smallest set of code changes needed.
4. Any directly dependent code that must also change.

Everything outside that boundary is OUT OF SCOPE.

Example:

User says:
> Fix the Wakala label from "Musaned Wakala" to "Wakala".

Correct:
- Find the affected Foreign Agency Wakala UI strings.
- Change those strings.
- Verify nothing else changed.

Incorrect:
- Redesign the Wakala page.
- Change its table columns.
- Rename API functions.
- Refactor notification logic.
- Modify Embassy UI.
- Reformat unrelated files.
- Update unrelated terminology.

---

# 2. DECLARE SCOPE BEFORE EDITING

Before making changes, establish:

### IN SCOPE
The exact requested bug/feature.

### REQUIRED SUPPORTING CHANGES
Only changes technically necessary for the requested fix.

### OUT OF SCOPE
Everything else.

If an issue is unrelated, DO NOT FIX IT during the current task.

Report:
> UNRELATED ISSUE DISCOVERED — NOT MODIFIED

---

# 3. DO NOT "IMPROVE" UNREQUESTED CODE

Do not change unrelated code because you believe it is:

- cleaner
- newer
- more elegant
- easier to maintain
- duplicated
- poorly named
- old-fashioned
- refactorable
- stylistically inconsistent

unless the change is necessary for the requested task.

The user's request takes priority over code cleanup.

---

# 4. PRESERVE EXISTING WORKING FEATURES

Assume existing behavior is intentional and working unless evidence proves otherwise.

Do NOT casually modify:

- working Excel-like operational tables
- working drawers/modals
- filters
- search
- sorting
- navigation
- authentication
- API wrappers
- RBAC/permissions
- notifications
- uploads
- previews
- state transitions
- existing styling/layout
- business logic

A requested change in one area does NOT grant permission to modify neighboring areas.

---

# 5. MINIMAL DIFF POLICY

Prefer the smallest possible diff.

When multiple solutions exist, choose the one with the smallest blast radius.

Prefer:

- one string change over a component rewrite
- one prop adjustment over a new abstraction
- one targeted condition over refactoring a page
- one API wrapper adjustment over changing API architecture
- a focused CSS/class change over redesigning a component

Do not rewrite working components just because you are already inside them.

---

# 6. NO UNRELATED FORMATTING

Do not run automatic formatters over the whole repository for a localized task unless necessary.

Do not create large formatting-only diffs.

Do not:
- change indentation throughout unrelated code
- reorder unrelated imports
- rewrap unrelated text
- rename unrelated variables
- reorder unrelated object properties
- convert quote styles
- change style conventions

A reviewer should be able to see exactly what changed for the requested task.

---

# 7. NO UNRELATED REFACTORING

Do NOT use a requested bug fix to perform:

- component decomposition
- state-management migration
- API architecture migration
- routing refactor
- folder restructuring
- naming cleanup
- type-system rewrite
- dependency upgrades
- UI redesign
- hook extraction
- design-system migration

unless that change is strictly required for the requested fix.

Useful but non-required refactors are PROHIBITED during the task.

---

# 8. DO NOT MODIFY BACKEND BEHAVIOR FROM THE FRONTEND

Never solve a frontend problem by weakening backend security or business rules.

Do NOT:

- bypass permissions
- add ignore_permissions
- grant broad roles
- use generic Frappe writes to bypass V2 APIs
- mutate lifecycle status directly
- add client-supplied authority fields
- bypass tenant isolation
- revive V1 endpoints
- introduce /api/resource/* business mutations

Use the existing V2 contract.

If the requested change cannot be correctly implemented without a backend change, report:

> BACKEND GAP — FRONTEND CANNOT SAFELY IMPLEMENT THIS WITHOUT A V2 BACKEND CHANGE

Do not invent an unsafe workaround.

---

# 9. NO "WHILE I'M HERE" FIXES

Never make additional changes with reasoning such as:

- "While I'm here..."
- "I also noticed..."
- "This would be cleaner..."
- "I fixed a few related things..."
- "I modernized the component..."
- "I cleaned up the surrounding code..."

Those changes are prohibited unless explicitly requested or strictly necessary.

---

# 10. UNRELATED BUG DISCOVERY

If an unrelated bug is discovered:

1. Continue only with the requested task.
2. Record the unrelated issue.
3. Do not modify it.

Example:

> Requested Wakala label fix: completed.
> Unrelated contractor permission issue discovered: NOT MODIFIED.

---

# 11. BEFORE/AFTER VERIFICATION

Before editing:

- inspect the current implementation
- understand why it works
- identify exact change location

After editing:

- inspect the diff
- confirm only intended files/lines changed
- verify the requested behavior
- run the smallest relevant test/check

---

# 12. DIFF REVIEW IS MANDATORY

After every user-requested change, inspect:

`git diff`

Then verify:

### Requested changes
What exactly changed?

### Required supporting changes
Why were the additional lines/files necessary?

### Unrelated changes
There must be NONE.

If unrelated changes were introduced accidentally:
REMOVE THEM before reporting completion.

Do not leave accidental unrelated modifications in the working tree.

---

# 13. PROTECT THE EXCEL-LIKE OPERATIONAL WORKFLOW

This project deliberately uses Excel-like operational tables for workflows such as:

- Saudi LMIS
- Saudi Taeshir
- Saudi Embassy
- Kuwait LMIS
- Kuwait Telesign
- Kuwait Embassy
- Ticketing
- other operational queues

When fixing one field, action, label, API call, or row behavior:

DO NOT redesign the table.

DO NOT replace it with cards.

DO NOT change column order unless specifically required.

DO NOT remove row actions.

DO NOT change drawer behavior.

DO NOT change filters/sorting.

DO NOT alter the interaction model.

Only modify the requested behavior.

---

# 14. PRESERVE V2 ARCHITECTURE

Keep:

- centralized requestV2
- V2 API wrappers
- backend-authoritative state machine
- role-based permissions
- tenant isolation
- dynamic corridor behavior
- real backend data
- real backend notifications
- real file handling

Do not reintroduce:

- V1 APIs
- deleted V1 business flows
- mock/demo fallbacks
- fake state
- client-owned lifecycle state

---

# 15. SMALL REQUEST ≠ BROAD TASK

Interpret requests narrowly unless the user explicitly asks for a broad refactor.

Examples:

### "Fix this button."
Scope:
- button behavior
- necessary action wiring

NOT:
- redesign the page

### "Change this label."
Scope:
- label text

NOT:
- global terminology cleanup

### "Add this field."
Scope:
- field + necessary API/persistence/display wiring

NOT:
- redesign the entire form

### "Fix this API call."
Scope:
- that API call + immediate dependent handling

NOT:
- rewrite all API wrappers

### "Fix this table column."
Scope:
- that column

NOT:
- rebuild the table

---

# 16. BROADER CHANGES ONLY WHEN DIRECTLY REQUIRED

A broader change is allowed only when it is a direct dependency.

Example:

User requests:
> Add a new backend-supported field to an operational table.

Potentially required:
- TypeScript response type
- API wrapper
- table column
- drawer field

These are all in scope because they are required to deliver the requested feature.

But do NOT also:
- rename neighboring fields
- reorder unrelated columns
- redesign the drawer
- refactor API architecture

---

# 17. DO NOT USE "CONSISTENCY" AS AN EXCUSE

Do not change another screen merely because the current requested screen now uses different terminology.

Only change other screens when:

1. The user explicitly requests global consistency, OR
2. Another occurrence directly causes the requested behavior to fail.

Otherwise leave it untouched.

---

# 18. CHANGE ISOLATION

For every task:

REQUEST
  ↓
EXACT FEATURE
  ↓
DIRECT DEPENDENCIES
  ↓
MINIMAL PATCH
  ↓
TARGETED TEST
  ↓
DIFF REVIEW

Do not expand the boundary without explicit justification.

---

# 19. FOCUSED COMMITS

A requested change should ideally produce a focused commit.

Do not mix unrelated work, for example:

Wakala label fix
+
Finance redesign
+
notification refactor
+
Contractor changes

Suggested style:

`fix: <specific requested change>`

Only commit when the task workflow asks for a commit.

---

# 20. REQUIRED FINAL REPORT

At the end of every task, report:

## Requested Change
Exactly what the user asked for.

## Files Modified
Only files actually modified.

## Changes Made
Brief explanation of each modification.

## Why Additional Files Were Needed
Only when more than one file changed.

## Verification
Tests/checks run and results.

## Unrelated Issues Discovered
List them, but explicitly state:
`NOT MODIFIED`

## Scope Guarantee
State whether unrelated functionality was changed.

Do not claim unrelated functionality was preserved unless you inspected the diff.

---

# 21. EMERGENCY ROLLBACK RULE

If a requested change unexpectedly alters unrelated behavior:

STOP.

Inspect the diff.

Revert the unrelated part.

Continue only with the intended change.

Never rationalize an accidental change as an "improvement."

---

# 22. PRIORITY ORDER

When making changes, follow this order:

1. User's exact request
2. Current V2 backend contract
3. Existing working frontend behavior
4. Minimal implementation necessary
5. Targeted verification
6. Refactoring/cleanup only when explicitly requested

Code elegance does NOT outrank scope control.

---

# 23. FINAL NON-NEGOTIABLE RULE

> CHANGE ONLY WHAT THE USER ASKED FOR AND WHAT IS STRICTLY REQUIRED TO MAKE THAT CHANGE WORK.

Everything else stays untouched.

When uncertain whether a change is required:

DO NOT CHANGE IT.

Report the uncertainty instead.
