# ECC Fork — Subfrost-Ops Specialization Inventory

Forked from `affaan-m/ECC` → `0xcasuwu/subfrost-ops`. 2,844 files. We're specializing for the Alkanes/Bitcoin metaprotocol stack (Rust+WASM + Next.js + Compose/SwiftUI mobile).

## Tag legend
- **KEEP-CORE** — useful in any project
- **KEEP-RUST** — used directly (alkanes-rs, metashrew, subzero-rs, mobile core)
- **KEEP-TS** — used directly (subfrost-app, alkanes-flashcards)
- **KEEP-SWIFT** — used directly (subfrost-mobile iOS)
- **KEEP-KOTLIN** — used directly (subfrost-mobile Android Compose)
- **LEARN-FROM** — copy the shape, don't keep the contents (e.g. healthcare-reviewer is the template for `alkanes-protocol-reviewer`)
- **ARCHIVE** — move to `archive/` so it's out of the way without losing history

## Directory totals
| Dir | Items | Action |
|---|---|---|
| `agents/` | 60 | Keep ~22, archive ~38 |
| `skills/` | 232 | Keep ~60, learn-from ~6, archive ~166 |
| `commands/` | 75 | Keep ~40, archive ~35 |
| `rules/` | 19 lang dirs + common | Keep `common/`, `rust/`, `typescript/`, `swift/`, `kotlin/`, subset of `web/`; archive rest |
| `hooks/` | hooks.json (2847 lines) | Keep — extend with alkanes-aware variants |
| `mcp-configs/` | 1 file | Extend with `alkanes-mcp` registration |
| `scripts/` | 167 files | Keep all infra; add `scripts/alkanes/` |
| `tests/` | 149 files | Keep; add coverage for new domain components |

## Agents — keep list
KEEP-CORE: planner, code-reviewer, code-architect, code-explorer, code-simplifier, comment-analyzer, docs-lookup, doc-updater, harness-optimizer, chief-of-staff, conversation-analyzer, opensource-forker/sanitizer/packager, refactor-cleaner, silent-failure-hunter, security-reviewer, performance-optimizer, tdd-guide, type-design-analyzer.

KEEP-RUST: rust-reviewer, rust-build-resolver.
KEEP-TS: typescript-reviewer, e2e-runner, pr-test-analyzer.
KEEP-SWIFT: swift-reviewer, swift-build-resolver.
KEEP-KOTLIN: kotlin-reviewer, kotlin-build-resolver.

LEARN-FROM (template for new domain agents):
- `healthcare-reviewer.md` → mint into `alkanes-protocol-reviewer`, `bitcoin-security-reviewer`, `wasm-contract-auditor`
- `defi-amm-security` (skill) → adapt into `alkanes-amm-security`

ARCHIVE: csharp-*, cpp-*, java-*, python-*, django-*, fastapi-*, go-*, flutter-*, dart-*, fsharp-*, harmonyos-*, pytorch-*, gan-*, mle-*, seo-*, a11y-*, homelab-*, network-* (unless mobile networking is needed later), database-reviewer (no SQL), healthcare-* (after we've used as templates).

## Skills — keep list (selected)
Generic workflow: tdd-workflow, verification-loop, e2e-testing, error-handling, git-workflow, security-review, docker-patterns, deployment-patterns, code-tour, codebase-onboarding, api-design, architecture-decision-records, continuous-learning-v2 (critical), continuous-learning, learn, evolve.

Rust: rust-patterns, rust-testing.
TS/Frontend: backend-patterns, frontend-patterns, nextjs-turbopack, vite-patterns, design-system.
Swift: swiftui-patterns, swift-concurrency-6-2, swift-actor-persistence, swift-protocol-di-testing.
Kotlin/Android: kotlin-patterns, kotlin-testing, kotlin-coroutines-flows, compose-multiplatform-patterns, android-clean-architecture.
Knowledge & retrieval: documentation-lookup, deep-research, content-hash-cache-pattern, context-budget.
Ops: github-ops, knowledge-ops, research-ops, project-flow-ops, harness-audit, workspace-surface-audit, cost-aware-llm-pipeline.

LEARN-FROM (domain shape):
- `healthcare-emr-patterns`, `healthcare-cdss-patterns`, `healthcare-eval-harness` — patterns for our `alkanes-eval-harness`
- `defi-amm-security`, `llm-trading-agent-security` — patterns for our `alkanes-amm-security`, `bitcoin-mev-awareness`

ARCHIVE: all python/golang/django/laravel/java/springboot/perl/cpp/csharp/fsharp/flutter-dart/dotnet/angular/mysql/clickhouse/redis (keep redis if mobile uses it for cache later) variants; all motion-/manim-/blender-/remotion-/video-editing/ui-to-vue (unless we end up needing demo videos).

## Rules — language dirs
KEEP: `common/`, `rust/`, `typescript/`, `swift/`, `kotlin/`, subset of `web/`.
NEW: `rules/alkanes/` (we author) — coding-style.md, hooks.md, patterns.md, security.md, testing.md.
ARCHIVE: python/, golang/, java/, cpp/, csharp/, dart/, fsharp/, perl/, php/, ruby/, angular/, arkts/, zh/.

## Continuous-learning-v2 — critical mechanism
- **Capture**: hook-driven (100% reliable), not skill-fired. `observe.sh` registers PreToolUse/PostToolUse and writes JSONL.
- **Storage**: `$XDG_DATA_HOME/ecc-homunculus/` with project-scoped subdirs keyed by hash of `git remote get-url origin` — same repo on different machines = same project ID.
- **Confidence**: 0.3 tentative → 0.5 moderate → 0.7 strong → 0.9 near-certain. Increases on repeated observation + no correction; decreases on correction + decay.
- **`/evolve`**: clusters related instincts into skills/commands/agents; auto-promotes project instincts to global when same id appears in 2+ projects with ≥0.8 confidence.
- **Configuration**: `skills/continuous-learning-v2/config.json` — `observer.enabled` (turn ON), `run_interval_minutes` (default 5), `min_observations_to_analyze` (default 20). Env override: `CLV2_HOMUNCULUS_DIR`.
- **Scope guide**: language/framework/file-structure/code-style = project-local; security/general-best-practices/git/tool-workflow = global.

**Action**: Enable in our fork's default settings.json so it captures Alkanes patterns from day one.

## Hooks worth keeping/activating
From `hooks/hooks.json`:
- `pre:observe:continuous-learning` — **ENABLE**
- `pre:bash:dispatcher` — quality gates
- `pre:governance-capture` — activate with `ECC_GOVERNANCE_CAPTURE=1`
- `pre:config-protection` — block linter config edits
- `pre:mcp-health-check` — validate MCP servers

## New components we'll author
### Agents (10)
- alkanes-explorer
- alkanes-protocol-reviewer (modeled on healthcare-reviewer)
- bitcoin-security-reviewer
- wasm-contract-auditor
- protostone-debugger
- subfrost-frontend-reviewer
- metashrew-indexer-reviewer
- subzero-frost-reviewer (security-critical: zeroization, byzantine handling)
- subfrost-mobile-ffi-reviewer (uniffi checksum, JNI thread safety)
- cross-repo-navigator

### Skills (14+)
- protostone-pattern, opcode-dispatch, receipt-model, three-phase-init, edict-routing, cellpack-construction, height-poller-frontend, browser-wallet-safety, alkanes-test-harness, metashrew-indexer-patterns, wasm-build-pipeline, ts-sdk-alkanes-execute, uniffi-checksum-survival, frost-roast-signing-flow, cross-repo-navigation, alkanes-onboarding.

### Rules
`rules/alkanes/` with the standard 5-file shape.

### Slash commands
/alkanes-deploy, /protostone-debug, /opcode-trace, /receipt-explain, /alkanes-test, /metashrew-trace, /cross-repo-grep, /flashcard-lookup (bridges to alkanes-flashcards).

## Existing assets in the 0xcasuwu ecosystem we should integrate
- **alkanes-flashcards**: 280+ atomic domain facts across 24+ decks (Factory Opcodes, Pool Opcodes, Protostone Encoding, Trace Pulling, Carbine CLOB, frBTC, Mental Models, Pre-Work Rules, Receipt-Based Auth, etc.). **Lift each deck → one skill cheatsheet** so the LLM can pull cards via skill invocation.
- **alkanes-mcp**: MCP server exposing 6 alkanes repos as tools (`list_files`, `search_code`, `get_function_details`, `list_classes`, etc.). **Register in `mcp-configs/mcp-servers.json`** so any Claude Code session in the fork has it.

## Phased build-out (chosen "Full upfront build-out")
1. Save all pattern docs to `docs/patterns/` (this batch).
2. Archive irrelevant components into `archive/` per the lists above.
3. Author the 10 domain agents, 14+ skills, `rules/alkanes/` pack.
4. Wire continuous-learning-v2 enabled-by-default for the fork.
5. Author SessionStart hooks that detect cwd and inject the right cheatsheets per target repo.
6. Author CLAUDE.md templates for each of subfrost-app, alkanes-rs, metashrew, subzero-rs, subfrost-mobile.
7. Register alkanes-mcp + add `/flashcard-lookup` command that talks to alkanes-flashcards DB.
8. Document install + verify workflow.
9. Commit + push + tag v0.1.0.
