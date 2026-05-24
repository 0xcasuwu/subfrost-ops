---
name: protostone-cellpack-edicts
description: How to construct, decode, and debug protostones (Tags 16383→81→cells), cellpacks (target + opcode + inputs), and edicts (with the critical output:1 routing for incomingAlkanes). The single most-cited mistake source in the stack.
origin: subfrost-ops
---

# Protostone / Cellpack / Edict

These three concepts are inseparable. A protostone is the on-chain envelope; a cellpack is the message inside the envelope; edicts route tokens to (or from) the message.

## When to use
- Constructing a contract call (frontend or test harness)
- Decoding a transaction to understand what it intended
- Debugging "transaction confirmed but nothing happened" (silent no-op)
- Debugging "tokens didn't arrive at the contract" (edict routing)

## The shape (Rust canonical)

```rust
Protostone {
    message: into_cellpack(vec![target.block, target.tx, opcode, ...args]).encipher(),
    protocol_tag: AlkaneMessageContext::protocol_tag() as u128,
    pointer: Some(0),   // where unused alkanes go (vout index)
    refund: Some(0),    // where refunds go (vout index)
    edicts: vec![
        ProtostoneEdict {
            id: ProtoruneRuneId { block: 2, tx: 1 },
            amount: 1000,
            output: 1,  // <-- routes to the OP_RETURN (the protostone itself)
                        //     so the runtime hands the tokens to the contract
                        //     as incomingAlkanes
        }
    ],
}
```

## The shape (TS SDK)

```ts
await alkanesExecuteWithStrings({
    target: { block: 2, tx: 99 },
    opcode: 13,                            // factory router opcode
    inputs: [poolId, amountIn, amountOutMin],
    inputRequirements: [
        "32:0:1000",                       // 1000 of [32:0] (frBTC) to the cellpack
        "B:600",                           // 600 sats of Bitcoin
    ],
    // SDK auto-generates the p0 edict from inputRequirements.
    // DO NOT also construct edicts manually — double-edict bug.
});
```

## The two-protostone pattern
Operations that send alkanes to a contract require:
- **p0** (edict-only) — moves the tokens to vout containing p1
- **p1** (cellpack) — calls the contract; receives the tokens as incomingAlkanes

The SDK auto-builds p0 from `inputRequirements`. You build p1.

## Common failures
| Symptom | Cause |
|---|---|
| Tx confirmed, nothing happened | `protocol_tag` wrong — runtime ignored the protostone |
| Tokens arrived at recipient vout, not contract | `output:` index wrong; should be the OP_RETURN vout (usually 1) |
| "double-edict" — funds counted twice | Manually constructed edict on top of SDK's `inputRequirements` |
| Cellpack dispatched to opcode 0 instead of intended | Inputs misordered; first two cells must be `target.block`, `target.tx` |
| Refund went to wrong address | `refund` / `pointer` pointing at the wrong vout |

## Debugging
1. Decode the tx's OP_RETURN with `protostone-debugger` agent
2. Validate `protocol_tag` against `AlkaneMessageContext::protocol_tag()`
3. Validate every `output:` index against the actual vout layout
4. If the call dispatched but did nothing: read the contract's opcode handler — likely a silent early-return

## Reference
- `docs/patterns/alkanes-rs.md` — Protostone / Cellpack section
- `docs/patterns/contracts-frost-boiler-fujin.md` — Canonical test harness
- flashcard deck "Protostone Encoding" — 5 cards on the three-layer decoding
- flashcard deck "Trace Pulling" — 7 cards on debugging via traces
