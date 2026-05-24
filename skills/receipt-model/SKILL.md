---
name: receipt-model
description: The Alkanes ownership / authentication model. Ownership = holding a receipt token (or protocol auth token), NOT being a known address. Replaces Ethereum's msg.sender mental model.
origin: subfrost-ops
---

# Receipt-Based Auth

Alkanes contracts cannot identify a "user" — there's no `msg.sender`. Instead, the right to act on a position is encoded as a token. Holding the token = ownership.

## When to use
- Designing any contract opcode that needs caller authorization
- Reviewing code that uses `context.caller` (almost always wrong)
- Cross-contract calls where one contract authorizes another

## The pattern

### Per-position receipts
When a contract creates a position (a trove, a stake, an LP), it mints a unique auth token and returns it to the caller in the outgoing parcel. The caller's wallet now holds that token.

To act on the position later, the caller spends the token back into the contract as `incomingAlkanes`. The contract checks that the right token is present and proceeds.

```rust
// Open a position
fn open(&self) -> Result<CallResponse> {
    let receipt_id = mint_receipt_token();          // unique per position
    storage_pointer(&receipt_id).set_value(state);  // bind state to receipt id
    Ok(CallResponse {
        alkanes: vec![AlkaneTransfer { id: receipt_id, value: 1 }],
        ..
    })
}

// Close a position
fn close(&self, context: &Context) -> Result<CallResponse> {
    let receipt_id = context.incoming_alkanes
        .iter()
        .find(|a| is_receipt_token(a.id))
        .ok_or(Error::NoReceipt)?
        .id;
    let state = storage_pointer(&receipt_id).get_value();
    // ... act on state
}
```

### Protocol auth tokens (cross-contract handshake)
For long-lived cross-contract trust (e.g. a borrower-ops contract calling trove-manager), one persistent token is passed in every call. The callee verifies it and returns it.

```rust
// Borrower-ops calls trove-manager
let response = self.call(
    Cellpack { target: trove_manager_id, inputs: vec![opcode, ...] },
    AlkaneTransferParcel { alkanes: vec![protocol_auth_token, ...] },
);
// Callee verifies protocol_auth_token in context.incoming_alkanes; returns it.
```

## What NOT to do
- ❌ Check `context.caller` to authorize — there isn't one; it's the runtime
- ❌ Mint a receipt token without binding state to its id
- ❌ Issue a new receipt token on every call to the same position (creates an attack surface)
- ❌ Forget to return the protocol auth token from a cross-contract callee — caller can't reuse it

## Three-phase init interaction
- Phase 1 (deploy) — WASM indexed by metashrew
- Phase 2 (opcode 0 init) — contract mints/registers its receipt-token template AND the protocol auth token if any
- Phase 3 (finalize) — cross-contract auth tokens distributed (e.g. lending-protocol binds its borrower-ops + trove-manager via the shared auth token)

## Reference
- `docs/patterns/contracts-frost-boiler-fujin.md` — Ownership / auth section
- flashcard deck "Receipt-Based Auth" — 4 cards on the pattern
