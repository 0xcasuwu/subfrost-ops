---
description: Generate stack/SNAPSHOT.md — current HEAD per repo, recent commits, version skew, fork heights. Run weekly or before any cross-repo PR.
---

# /stack-snapshot

Runs `node scripts/stack/snapshot.js`. Aggregates current state across the 5 stack repos and writes `stack/SNAPSHOT.md`.

Use the output as your situational-awareness brief before opening a PR that touches more than one repo.
