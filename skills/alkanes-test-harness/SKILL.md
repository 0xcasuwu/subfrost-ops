---
name: alkanes-test-harness
description: Canonical Rust integration test pattern for Alkanes contracts — protostones with output:1 edicts, multi-contract scenarios, balance and storage assertions. Mirrors boiler's qa_precision_test.rs.
origin: subfrost-ops
---

# Alkanes Test Harness

## When to use
- Writing a new contract integration test
- Reviewing test coverage for a new opcode
- Debugging a test that "should pass but doesn't"

## The canonical scenario shape

```rust
#[test]
fn deposit_then_withdraw() -> Result<()> {
    // 1. Init the harness (mock runtime + storage)
    let mut h = TestHarness::new();

    // 2. Deploy WASM templates
    let contract_id = h.deploy_template(include_bytes!("../wasm/my_contract.wasm"))?;

    // 3. Init the contract (opcode 0)
    h.execute_protostone(contract_id, 0, vec![], vec![])?;

    // 4. Deposit (opcode 1) — send 1000 of [2:1] as incomingAlkanes
    let receipt = h.execute_protostone(
        contract_id,
        1,                                              // opcode
        vec![],                                         // cellpack args
        vec![                                           // edicts
            ProtostoneEdict {
                id: ProtoruneRuneId { block: 2, tx: 1 },
                amount: 1000,
                output: 1,                              // <-- routes to OP_RETURN
            },
        ],
    )?;

    // 5. Assert: contract holds the 1000
    assert_eq!(h.storage(contract_id, "/total_deposits")?, 1000u128);
    assert_eq!(h.balance(test_user, receipt_token_id), 1u128);

    // 6. Withdraw (opcode 2) — spend the receipt token back
    h.execute_protostone(
        contract_id,
        2,
        vec![],
        vec![
            ProtostoneEdict {
                id: receipt_token_id,
                amount: 1,
                output: 1,
            },
        ],
    )?;

    // 7. Assert final state
    assert_eq!(h.balance(test_user, ProtoruneRuneId { block: 2, tx: 1 }), 1000u128);
    Ok(())
}
```

## Canonical protostone construction
```rust
Protostone {
    message: into_cellpack(vec![target.block, target.tx, opcode]).encipher(),
    protocol_tag: AlkaneMessageContext::protocol_tag() as u128,
    pointer: Some(0),
    refund: Some(0),
    edicts: vec![
        ProtostoneEdict {
            id: ProtoruneRuneId { block: 2, tx: 1 },
            amount: 1000,
            output: 1,
        }
    ],
}
```
The `output: 1` is the magic — it routes the edict's tokens to the OP_RETURN vout (which contains the protostone itself), so the runtime hands them to the contract as `incomingAlkanes`.

## Multi-contract scenarios
- Deploy all contracts first
- Init each (opcode 0)
- Finalize (cross-contract auth distribution)
- Then run the scenario

## Assertions
- `h.storage(contract, "/path")` — typed read of storage
- `h.balance(holder, token_id)` — balance via `BalanceSheetOperations`
- `h.trace(tx)` — for debugging a failed call (returns the runtime trace)

## Pre-built WASMs
For contracts you're not actively building, use pre-built WASMs:
- `~/reference/frost-lend/src/tests/wasm/` — 11 lending contracts
- `~/reference/boiler/src/tests/wasm/` — staking
- `~/reference/Fujin-contracts-main/...` — prediction market

## Pitfalls
- Forgetting `output: 1` — edict routes to vout 1 as a normal output, not to the protostone
- Forgetting `protocol_tag` — runtime ignores the protostone
- Wrong opcode index — handler not found, test fails silently with "no-op"
- Wrong `ProtoruneRuneId` — token id mismatch, edict has nothing to route

## Reference
- `docs/patterns/contracts-frost-boiler-fujin.md` — Canonical test harness
- `~/reference/boiler/.../qa_precision_test.rs:335-410` (deposit) and `:441-511` (withdrawal)
- flashcard deck "Receipt-Based Auth"
