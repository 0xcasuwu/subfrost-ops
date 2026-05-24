# subfrost-ops

A Claude Code domain pack for the Alkanes / Bitcoin metaprotocol stack — Rust+WASM contracts (alkanes-rs, frost-lend, boiler, Fujin, subfrost-alkanes), the metashrew runtime, the Next.js frontend (subfrost-app), threshold signing (subzero-rs), and the cross-platform mobile wallet (subfrost-mobile).

Forked from [`affaan-m/ECC`](https://github.com/affaan-m/ECC) as `0xcasuwu/subfrost-ops`. Inherits the full ECC harness (60 agents, 232 skills, hooks, rules, continuous-learning-v2) and layers Alkanes-specific knowledge on top.

## Why this fork exists

A general-purpose Claude Code harness has no idea what a protostone is, why receipt tokens replace `msg.sender`, that browser-wallet symbolic addresses cost real money, or that uniffi bindings must be regenerated from a debug `.so`. Knowledge of those things lives across 12+ repos, a flashcards app, an MCP server, and the heads of three people.

This pack consolidates that knowledge into shape Claude Code natively understands — skills, agents, rules, hooks — and turns on the `continuous-learning-v2` instinct system so the pack grows automatically as more is discovered.

## What's in it

| Component | Count | Highlights |
|---|---:|---|
| Domain agents | 10 | `alkanes-explorer`, `alkanes-protocol-reviewer`, `bitcoin-security-reviewer`, `wasm-contract-auditor`, `protostone-debugger`, `subfrost-frontend-reviewer`, `metashrew-indexer-reviewer`, `subzero-frost-reviewer`, `subfrost-mobile-ffi-reviewer`, `cross-repo-navigator` |
| Domain skills | 14 | `alkanes-onboarding`, `protostone-cellpack-edicts`, `receipt-model`, `three-phase-init`, `opcode-dispatch`, `height-poller-frontend`, `browser-wallet-safety`, `ts-sdk-alkanes-execute`, `metashrew-indexer-patterns`, `wasm-build-pipeline`, `alkanes-test-harness`, `uniffi-checksum-survival`, `frost-roast-signing-flow`, `cross-repo-navigation` |
| Domain rules | 5 | `rules/alkanes/{coding-style, hooks, patterns, security, testing}.md` |
| Slash commands | 8 | `/alkanes-deploy`, `/protostone-debug`, `/opcode-trace`, `/receipt-explain`, `/alkanes-test`, `/metashrew-trace`, `/cross-repo-grep`, `/flashcard-lookup` |
| Hooks | 1 new | `scripts/hooks/alkanes-context-injector.js` — SessionStart cwd → cheatsheet mapping |
| CLAUDE.md templates | 5 | one per target repo (`alkanes-rs`, `subfrost-app`, `metashrew`, `subzero-rs`, `subfrost-mobile`) |
| Pattern docs | 7 | `docs/patterns/{INVENTORY, alkanes-rs, subfrost-app, metashrew, subzero-rs, subfrost-mobile, existing-knowledge-assets, contracts-frost-boiler-fujin}.md` |
| Continuous-learning-v2 | enabled by default | so every Alkanes-stack session captures instincts from day one |

## v0.2.0 additions — integrated-codebase mode

The v0.1.0 surface treats each repo as a destination for the harness. v0.2.0 makes the harness *aware that the five repos are one system*.

| Component | What it does |
|---|---|
| `stack/manifest.yaml` | Single source of truth — for each repo: clone path, default branch, `last_known_good` SHA, cross-repo deps, fork heights, version pins. Also encodes 7 cross-cutting invariants (incoming-alkanes-routing, receipt-not-caller, no-symbolic-addresses-on-browser-wallets, uniffi-debug-so-bindings, factory-router-not-pool-direct, three-phase-init-guard, zeroize-secret-material). |
| `scripts/stack/freshness.js` | Auto-invoked at SessionStart. Compares each local HEAD against manifest pins AND upstream develop tips. Surfaces MANIFEST-DRIFT and UPSTREAM-DRIFT loudly so the LLM doesn't reason against stale code. Solves the exact failure mode the v0.1.0 pattern-mining hit. |
| `scripts/stack/snapshot.js` | Generates `stack/SNAPSHOT.md` — recent commits per repo, version skew between `subfrost-app`'s pinned `@alkanes/ts-sdk` and the live alkanes-rs ts-sdk, fork-height status. Run before any cross-repo PR. |
| `agents/stack-preflight.md` | MUST-USE before any change touching a cross-repo seam. Verifies the SDK call exists, the opcode dispatches, the cellpack arity matches, the wallet adapter handles it, the test fixture exists, the binding is in sync. Outputs a verdict + pre-merge checklist. |
| `skills/stack-as-codebase` | The integrated-codebase mental model. ASCII diagram of the 5 repos and their seams. The 7-step verification protocol. The fail-shut principle. Auto-loaded by the SessionStart hook for every stack repo. |
| `scripts/hooks/observe-stack.js` | Tags continuous-learning observations with `stack:subfrost-ops` whenever cwd matches a stack repo. `/evolve` then clusters those into stack-wide skills rather than project-local ones — so a pattern observed in subfrost-app naturally becomes available when working in alkanes-rs. |
| `scripts/stack/flashcard-lookup.js` | Working implementation of `/flashcard-lookup`. Parses the alkanes-flashcards seed-data{,v2,v3}.ts files; filters by topic / deck / max-difficulty; returns matched cards in markdown. |
| `mcp-configs/mcp-servers.json` | `alkanes-mcp` server registered. Exposes 6 alkanes-stack repos as searchable resources. Enable per-session via `/mcp`. |
| New slash commands | `/stack-preflight`, `/stack-snapshot`, `/stack-freshness` |

### How comprehension grows

```
session N in subfrost-app
   ↓ observation captured by CL2 (project-scoped via git remote hash)
   ↓ tagged with stack:subfrost-ops by observe-stack hook
session N+1 in alkanes-rs
   ↓ /evolve clusters cross-project instincts into a stack-wide skill
   ↓ next session in ANY stack repo, the new skill is offered
```

The longer the harness is used across the stack, the better its situational awareness becomes — without polluting other projects' learned patterns.

### Verification protocol (the v0.2.0 contract)

Before claiming a non-local change is "done":
1. `stack/manifest.yaml` — does the change touch any `cross_repo_deps` or `invariants`?
2. Run `stack-preflight` agent with the change description
3. Run `/stack-freshness` to confirm working trees aren't drifted from manifest pins
4. For frontend/SDK: grep both repos for the symbol; verify every caller
5. For contracts: confirm a canonical test covers the modified opcode
6. For mobile/FFI: confirm `tests/uniffi_bindings_in_sync.rs` was re-run
7. For runtime: confirm a reorg test covers the rollback path

## Install

### Option 1 — Claude Code plugin (recommended once published)
```
/plugin marketplace add https://github.com/0xcasuwu/subfrost-ops
/plugin install subfrost-ops@subfrost-ops
```

### Option 2 — manual clone
```bash
git clone https://github.com/0xcasuwu/subfrost-ops.git ~/reference/ECC
cd ~/reference/ECC
./install.sh --profile full          # macOS/Linux
.\install.ps1 --profile full         # Windows PowerShell
```

This populates `~/.claude/` with the full pack. The `rules/alkanes/` pack is the one that ECC's standard installer doesn't auto-distribute — copy it manually:
```bash
cp -r rules/alkanes ~/.claude/rules/ecc/
```

### Per-repo activation
Drop the matching CLAUDE.md template into the target repo:
```bash
cp ~/reference/ECC/templates/CLAUDE.md.alkanes-rs ~/code/alkanes-rs/CLAUDE.md
cp ~/reference/ECC/templates/CLAUDE.md.subfrost-app ~/code/subfrost-app/CLAUDE.md
# ... etc
```

## Verify

After install, spawn a Claude Code session in any of the target repos and confirm:
1. `alkanes-context-injector` fires at SessionStart and lists the right cheatsheet skills for the cwd
2. `/alkanes-onboarding` invokes the master skill cleanly
3. `continuous-learning-v2` observer is enabled (`/instinct-status` reports a project hash + observation count)
4. Pattern docs render in `docs/patterns/`

Smoke test the agents:
```
> use the alkanes-explorer agent to trace opcode 11 (AddLiquidity) end-to-end
> use the protostone-debugger agent to decode <txid>
> use the bitcoin-security-reviewer agent on the current diff
```

## Growing the pack

Three loops keep this pack improving:

1. **Continuous-learning-v2 instincts** — every tool call captured to `$XDG_DATA_HOME/ecc-homunculus/projects/<hash>/observations.jsonl`. Run `/evolve` periodically to cluster instincts into new skills/commands. Run `/promote` to lift cross-project patterns to global scope.
2. **Flashcards → skills** — every new deck in `alkanes-flashcards` is a candidate for a new skill. The `/flashcard-lookup` command bridges to the existing 280+ curated facts.
3. **Patterns docs** — `docs/patterns/*.md` are living documents. Update them when a new pattern emerges, when a postmortem reveals an anti-pattern, or when an upstream repo refactors materially.

## Related assets in the 0xcasuwu ecosystem

- [`alkanes-flashcards`](https://github.com/0xcasuwu/alkanes-flashcards) — 280+ curated domain facts (SM-2 spacing). Read `docs/patterns/existing-knowledge-assets.md` for the integration plan.
- [`alkanes-mcp`](https://github.com/0xcasuwu/alkanes-mcp) — MCP server exposing 6 alkanes repos as tools (`list_files`, `search_code`, `get_function_details`, etc.). Register in `~/.claude/mcp-configs/mcp-servers.json` to surface in any Claude Code session.

## Upstream

This is a fork of `affaan-m/ECC`. Keep the upstream remote and pull in fixes / new agents / new skills periodically:
```bash
git remote add upstream https://github.com/affaan-m/ECC
git fetch upstream
git merge upstream/main
# resolve conflicts (mostly in /docs/* index files and command registry)
```

## License

Inherits ECC's license. Domain-specific additions (`agents/alkanes-*`, `skills/{alkanes-onboarding, protostone-cellpack-edicts, ...}`, `rules/alkanes/`, `commands/{alkanes-deploy, protostone-debug, ...}`, `docs/patterns/*`) are MIT-licensed by 0xcasuwu.
