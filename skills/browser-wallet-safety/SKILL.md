---
name: browser-wallet-safety
description: The 2026-03-01 symbolic-address bug and other browser-wallet-specific safety rules. Symbolic addresses (p2tr:0) resolve to the SDK's dummy wallet for browser wallets — costs real money. Plus PSBT patching, UTXO selection, and per-adapter quirks.
origin: subfrost-ops
---

# Browser Wallet Safety

## When to use
- Writing any mutation hook that signs a transaction
- Reviewing wallet-touching code
- Adding a new wallet adapter

## The cardinal rule
**Browser wallets MUST receive real address strings, not symbolic refs like `p2tr:0`.**

Symbolic refs (`p2tr:0`, `:0`, `recipient:0`) work for keystore wallets because the SDK has the wallet and can resolve them. For browser wallets (UniSat, Xverse, OKX, OYL) the SDK doesn't have the private keys — it falls back to its dummy wallet and produces an unspendable output that the user signs.

This caused token loss on mainnet (TX `985436b5...` on 2026-03-01).

```ts
const recipient = wallet.kind === 'keystore'
    ? 'p2tr:0'                  // symbolic OK
    : await wallet.getAddress(); // real address for browser wallets
```

Verified callers (all fixed 2026-03-01): `useSwapMutation.ts`, `useAddLiquidityMutation.ts`, `useRemoveLiquidityMutation.ts`, `useWrapSwapMutation.ts`, `useSwapUnwrapMutation.ts`, `useUnwrapMutation.ts`.

## PSBT patching
Taproot inputs need `tapInternalKey`. Many browser wallets fail SDK signing without it.
```ts
const patched = await patchTapInternalKey(psbt, wallet);
```

## UTXO selection
Alkane / inscription / rune-bearing UTXOs MUST be queried before selecting any UTXO for fee or change:
- Query `ord_outputs` RPC for inscriptions/runes
- Query alkane indexer for alkane balances
- Exclude dust (<1000 sats) unless the caller knows it holds the target asset
- Multi-asset UTXOs: skip or warn

## Wallet adapter quirks
| Adapter | Quirk |
|---|---|
| UniSat | Direct-signing bypass available; SDK adapter sometimes mangles taproot inputs |
| Xverse | Direct-signing bypass available; PSBT v0 only |
| OKX | New, integrated 2026-03; test all paths |
| OYL | Legacy SDK; mostly works but verify per-release |
| Keystore | SDK signs directly; symbolic addresses fine |

## Direct-signing bypass example (subfrost-app)
```ts
// WalletContext.tsx:1720-1787 has the bypasses
const signed = await wallet.signPsbtDirect(psbt);  // not via SDK adapter
```

## Reference
- `docs/patterns/subfrost-app.md` section 2 & 5
- flashcard deck "Wallet Safety" — 5+ cards on these exact patterns
- TX `985436b5...` postmortem (in alkanes-flashcards "Incident Postmortems" deck)
