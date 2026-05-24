---
name: three-phase-init
description: Every Alkanes contract initializes in three phases — deploy (WASM indexed), opcode 0 (init / storage setup), finalize-auth (cross-contract binding). Skipping or reordering breaks the protocol silently.
origin: subfrost-ops
---

# Three-Phase Init

## When to use
- Writing a new Alkanes contract
- Reviewing init logic
- Diagnosing "contract deployed but calls revert"

## The three phases

### Phase 1 — Deploy
Indexer sees the WASM contract bytes and registers them with a sequence-assigned AlkaneId (e.g. `{block: 2, tx: <seq>}`). At this point the contract exists but has no storage and cannot execute its opcode handlers safely.

### Phase 2 — `init` (opcode 0)
The factory calls opcode 0 on the new contract. This:
- Writes the contract's identity into storage (`/contract_name`, `/params/*`)
- Mints any singleton tokens (the protocol auth token, the receipt-token template)
- Sets `/initialized = true` (or equivalent guard)
- MUST be idempotent — repeated calls reject

Every opcode handler other than `init` MUST check `/initialized` at the top and revert if false.

### Phase 3 — Finalize auth
For multi-contract protocols (e.g. frost-lend's 11 contracts), one or more "wire-up" calls bind contracts to each other:
- Distribute the protocol auth token across the contract set
- Each contract stores the AlkaneIds of its trusted peers
- Once finalized, no further wire-up calls accepted (guard with `/finalized = true`)

## Canonical opcode 0

```rust
fn init(&self, ctx: &Context) -> Result<CallResponse> {
    let init_guard = StoragePointer::from_keyword("/initialized");
    if init_guard.get_value::<bool>() {
        return Err(Error::AlreadyInitialized);
    }
    init_guard.set_value(true);

    // mint protocol auth token (singleton)
    let auth_token = mint_protocol_auth();

    // store contract identity & params from ctx.inputs
    StoragePointer::from_keyword("/params/owner").set_value(ctx.inputs[1]);

    Ok(CallResponse {
        alkanes: vec![AlkaneTransfer { id: auth_token, value: 1 }],
        ..
    })
}
```

## Common failures
| Symptom | Cause |
|---|---|
| Calls revert after deploy | opcode 0 never called — call from factory or a deploy script |
| State corrupt after second deploy | `init` not idempotent-guarded |
| Cross-contract call rejected | protocol auth token wasn't distributed in finalize step |
| Re-init re-mints auth token | missing `/initialized` check, or guard set after the mint |

## Reference
- `docs/patterns/contracts-frost-boiler-fujin.md` — Three-phase init section
- flashcard deck "Mental Models" — boot phases card
