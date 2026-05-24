---
name: ts-sdk-alkanes-execute
description: How alkanesExecuteWithStrings works — inputRequirements format ("block:tx:amount" / "B:amount" / "32:0:1000"), how the SDK auto-generates the p0 edict, what NOT to construct manually.
origin: subfrost-ops
---

# TS-SDK: `alkanesExecuteWithStrings`

The primary entry point for calling an Alkanes contract from a TypeScript frontend. It abstracts the two-protostone construction.

## When to use
- Writing or reviewing any frontend mutation that calls a contract
- Debugging "the SDK call returns success but the contract didn't run"
- Understanding what the SDK does vs what you must do

## Signature (essentials)

```ts
await alkanesExecuteWithStrings({
    target: { block: number, tx: number },
    opcode: number,
    inputs: u128[],
    inputRequirements: string[],
    // wallet, fee rate, etc.
});
```

## `inputRequirements` format
Each string declares "this many of asset X needs to land at the cellpack vout":
- `"B:600"` — 600 sats of native Bitcoin (typically dust to host the cellpack output)
- `"32:0:1000"` — 1000 units of alkane `[32:0]` (frBTC)
- `"2:1:1"` — 1 unit of alkane `[2:1]` (position / receipt token)
- `"<block>:<tx>:<amount>"` — generic

The SDK:
1. Finds UTXOs in the wallet matching each requirement
2. Auto-generates the p0 (edict) protostone that routes those assets to vout containing p1
3. Builds the p1 (cellpack) with the supplied `target + opcode + inputs`
4. Constructs the final PSBT

## What you must NOT do
- ❌ Manually construct an edict in the same flow — double-edict bug
- ❌ Pass `inputRequirements` that the wallet can't satisfy (SDK errors confusingly; pre-check balance)
- ❌ Use symbolic addresses (`p2tr:0`) for non-keystore wallets — see `browser-wallet-safety`

## Factory vs pool routing
Some pool opcodes are missing on deployed pools (e.g. opcode 3 Swap). Use factory router opcodes instead:
- Factory opcode 13 (SwapExactTokensForTokens) replaces pool opcode 3
- Factory opcode 11 (AddLiquidity) replaces pool opcode equivalents
- Factory opcode 12 (RemoveLiquidity) likewise

Target the factory's AlkaneId; pass the pool id as the first input.

## SDK alias hygiene
subfrost-app uses `next.config.mjs` to alias `@alkanes/ts-sdk/wasm` → `lib/oyl/alkanes/`. After every SDK bump, re-sync the aliased WASM files or the runtime drifts from the SDK's bindings.

## Reference
- `docs/patterns/subfrost-app.md` sections 3, 4
- `docs/patterns/alkanes-rs.md` — TS SDK section
- flashcard decks "Factory Opcodes", "Pool Opcodes", "frBTC & Wrapping"
