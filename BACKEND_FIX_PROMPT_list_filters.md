# Backend fix: `filters` given as a list of objects is silently dropped

## Problem
`agency_tracking.api.placement.read?op=list_placements` returns **every** Placement when the
caller sends `filters` as a JSON list of objects, e.g.

```json
{ "filters": "[{\"applicant\":\"APP-05345\"}]", "limit_page_length": 100 }
```

Seen in production on `goagency-production.up.railway.app`: applicant APP-05345 (status Registered,
`active_placement: null`, no placements) received PLM-00001, which belongs to APP-05342 (Departed).
The frontend showed that case on APP-05345's page, including another sponsor's visa number, name,
ID and phone, and offered "Undo Case Step" against it. The frontend now checks this itself, but the
backend must not answer a filtered query with unfiltered data.

## Root cause
`internal/core/db.go`, `normFilters(doctype string, filters any)`:

```go
case L:
    for _, it := range fs {
        if l, ok := it.(L); ok {          // only inner LISTS are read
            out = append(out, oneFilter(l))
        }
    }
    if len(out) == 0 && len(fs) >= 3 { // fallback only for a flat [field, op, value]
        out = append(out, oneFilter(fs))
    }
```

An inner object (`M`) fails `it.(L)` and is skipped. A one-item list is shorter than 3, so the
fallback doesn't apply either. `out` comes back empty, so the query has **no WHERE clause**. Every
endpoint that routes `filters` through `normFilters` is affected (`list_placements`,
`list_applicants`, and any other `GetList`/`GetAll` caller that accepts client filters).

## Required change
1. In `normFilters`, inside the `case L:` loop, accept an `M` item and expand it with the same
   rules as the top-level `case M:` (a plain value becomes `=`, `[op, value]` becomes that op, any
   other list becomes `in`). Pull the existing `case M:` body into a helper and call it from both
   places, so the two paths can't drift apart.
2. **Fail closed.** If a non-empty `filters` value produces zero conditions, or a list item is
   neither `L` nor `M`, call `Throw("Invalid filter: ...")` and return a 4xx. Never fall back to an
   unfiltered query. The same goes for the `default:` branch: decide whether
   `name = Str(filters)` is really intended for non-string scalars, and otherwise throw.
3. Leave the shapes that already work unchanged: `nil`, `""`, a string (`name = ...`), an object
   `{field: value}`, `[[field, op, value], ...]`, `[doctype, field, op, value]`, and a flat
   `[field, op, value]`.

## Tests (add to the `internal/core` tests)
Table-test `normFilters` with:
- `[{"applicant":"APP-1"}]` gives `[["applicant","=","APP-1"]]`
- `[{"applicant":"APP-1"},{"status":["!=","Cancelled"]}]` gives both conditions
- `[{"status":["in",["A","B"]]}]` gives `status in [A,B]`
- `[{}]`, `[42]`, and `["x"]` each throw "Invalid filter" (they must not return an empty slice)
- every shape listed under step 3 gives the same result as before

Add an API-level test: create two applicants, each with one Placement, then call `list_placements`
with `filters='[{"applicant":"<A>"}]'`. Exactly one row should come back, for `<A>`.

## Check after deploy
With a logged-in session against Railway:
```
POST /api/method/agency_tracking.api.placement.read?op=list_placements
{"filters":"[{\"applicant\":\"APP-05345\"}]"}
```
This must return `data: []`, `total_count: 0`. Before the fix it returned PLM-00001.
