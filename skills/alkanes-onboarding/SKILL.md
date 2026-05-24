---
name: alkanes-onboarding
description: First-touch onboarding for any LLM working in the Alkanes/Bitcoin/subfrost stack. Loads the mental model, pre-work rules, and pointers to deeper skills before any code change.
origin: subfrost-ops
---

# Alkanes Onboarding

The first skill to load when working in any of: alkanes-rs, subfrost-app, metashrew, subzero-rs, subfrost-mobile, frost-lend, boiler, Fujin-contracts, subfrost-alkanes, alkanes-flashcards.

## When to use
- Starting a session in one of the above repos
- Asked to "fix X" or "implement Y" without context
- Before suggesting any pattern that touches: cellpacks, protostones, edicts, contract opcodes, wallet signing

## Mental model (load first)

### What Alkanes is
A metaprotocol on Bitcoin. State = UTXOs. Contracts = WASM modules indexed by metashrew. Calls = protostones embedded in OP_RETURN outputs. Ownership = receipt tokens, not addresses.

### What's NOT Ethereum
- No `msg.sender` — you prove ownership by *spending* a receipt token, not by being a known address
- No upgrades, no admin keys, no governance overrides
- No mempool reorg-resistance — wait for confirmation
- State is append-only and rolled back automatically on reorg (if you keyed correctly)

### The five layers
1. **Bitcoin layer** — UTXOs, scripts, signatures
2. **Runestone / protostone layer** — typed data in OP_RETURN
3. **Cellpack layer** — message to a contract (target AlkaneId + opcode + inputs)
4. **Contract layer** — WASM module with `MessageDispatch` opcode handlers
5. **Indexer / view layer** — metashrew reads protostones, runs contracts, commits state, exposes view functions

## Pre-work rules (always)
1. **Read before write.** Grep the canonical pattern in the reference repo before inventing.
2. **Use the SDK's `inputRequirements`** rather than constructing edicts manually.
3. **No symbolic addresses (`p2tr:0`) on browser-wallet paths.** Costs real money.
4. **Receipt tokens, not `context.caller`** for ownership.
5. **`output: 1` routes incoming alkanes to OP_RETURN** (the protostone vout).
6. **HeightPoller invalidates queries** — no `refetchInterval` on data hooks.
7. **Same-block read-modify-write is a metashrew hazard** — get + set on the same key won't see the in-flight write until next flush.
8. **WASM contracts compile under no_std with allocator + panic handler.** Check Cargo profile flags.

## What to load next (by context)
- Contract code → `alkanes-contract-conventions`, `protostone-cellpack-edicts`, `receipt-model`, `three-phase-init`
- Frontend hook → `subfrost-frontend-patterns`, `browser-wallet-safety`, `height-poller-frontend`, `ts-sdk-alkanes-execute`
- Indexer logic → `metashrew-indexer-patterns`, `wasm-build-pipeline`
- Mobile FFI → `uniffi-checksum-survival`
- Cross-repo question → invoke `cross-repo-navigator` agent

## Reference
- `docs/patterns/INVENTORY.md` — what's in this fork
- `docs/patterns/alkanes-rs.md` — canonical Rust patterns
- `docs/patterns/subfrost-app.md` — canonical frontend patterns
- `docs/patterns/contracts-frost-boiler-fujin.md` — canonical contract patterns
- `~/reference/alkanes-flashcards/lib/seed-data-v2.ts` — Pre-Work Rules deck, Mental Models deck
