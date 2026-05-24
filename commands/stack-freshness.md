---
description: Check whether the cloned repos have drifted from manifest pins or from upstream develop tips. Short report, suitable for SessionStart use.
---

# /stack-freshness

Runs `node scripts/stack/freshness.js`. Reports per-repo drift on two axes:
- **MANIFEST-DRIFT**: local HEAD ≠ `last_known_good` in `stack/manifest.yaml`. Means the harness's patterns docs were written against a different SHA than what you currently have checked out.
- **UPSTREAM-DRIFT**: local HEAD ≠ upstream develop/main tip. Means the world moved while you weren't looking.

Auto-invoked as part of the SessionStart context injection when cwd matches a stack repo.
