# subfrost-app — domain patterns

SUBFROST DeFi frontend. Next.js 13+ App Router, wallet integration for the Alkanes metaprotocol on Bitcoin. Located at `C:\Users\ed995\reference\subfrost-app` (develop branch).

## Architecture
Next.js 15+ Bitcoin Layer-0 DeFi app. AMM swaps, cross-chain bridges, yield vaults (FIRE protocol), wallet integration (UniSat, OYL, Xverse, OKX). Bridges `@alkanes/ts-sdk` WASM library with React-Query + Zustand stores.

Provider stack (`app/providers.tsx:133-169`):
QueryClient → GlobalStore → ModalStore → ThemeProvider → LanguageProvider → DevnetProvider → AlkanesSDKProvider → HeightPoller → WalletProvider → TransactionConfirmProvider → NotificationProvider.

SDK alias in `next.config.mjs`: `@alkanes/ts-sdk/wasm` → `lib/oyl/alkanes/` WASM files. Must be re-synced after every SDK bump.

## Critical patterns (file:line citations)

### 1. HeightPoller — single source of query invalidation
`queries/height.ts`. Polls block height every 10s. On block increase, invalidates all queries EXCEPT height itself and frBTC-premium (`queries/height.ts:142-153`) — avoids oscillation from Espo's load-balancing.

All data hooks use `staleTime: Infinity` and never self-refresh; they wait for HeightPoller to invalidate.

### 2. Browser-wallet output address bug (2026-03-01) — MANDATORY for all mutation hooks
Symbolic addresses (`p2tr:0`) resolve to the SDK's dummy wallet for browser wallets. Caused token loss on mainnet (TX `985436b5...`).
**Fix**: use real address strings for browser wallets; symbolic refs only for keystore.
Verified in: `useSwapMutation.ts:22-84`, `useAddLiquidityMutation.ts`, `useRemoveLiquidityMutation.ts`, `useWrapSwapMutation.ts`, `useSwapUnwrapMutation.ts`, `useUnwrapMutation.ts` (all fixed 2026-03-01).

### 3. Factory router vs pool direct calls
Pool opcode 3 (Swap) is missing on deployed `[4:65496]`. Must call factory opcode 13 (SwapExactTokensForTokens) instead. Same two-protostone pattern, but p1 targets factory.
Applied in: `useSwapMutation.ts:99-146`, `useWrapSwapMutation.ts`, `useSwapUnwrapMutation.ts`.

### 4. Two-protostone pattern
Operations sending alkanes to contracts need:
- p0 (edict) — transfers tokens to p1
- p1 (cellpack) — calls the contract

SDK auto-generates p0 from `inputRequirements`. Do NOT manually construct edicts (double-edict bug — see `useSwapMutation.ts:99-110`).
Format: `buildSwapInputRequirements` returns `"B:amount"` for BTC, `"block:tx:amount"` for alkanes.

### 5. Browser wallet PSBT patching
`tapInternalKey` must be patched for Taproot inputs in `lib/wallet/browserWalletSigning.ts`. Xverse and UniSat have direct signing bypasses to avoid SDK adapter failures (`WalletContext.tsx:1720-1787`).

### 6. UTXO selection pitfall
Alkane transfers must query the alkane indexer + `ord_outputs` RPC to detect inscriptions/runes. Dust UTXOs (<1000 sats) can carry multiple asset types; blindly selecting them causes token loss. Collateral warning in `SendModal.tsx` (2026-03-03 fix).

### 7. Regtest/mainnet pool collision
Genesis alkane ids (2:0 DIESEL, 32:0 frBTC) are identical on mainnet and regtest. Espo returns mainnet reserves, poisoning regtest swap quotes ~191x.
**Fix**: skip Espo on regtest in `useAlkanesTokenPairs.ts` and `usePools.ts`; use RPC simulation fallback (factory opcode 3 + pool opcode 999).

## Directory reference
- `app/` — Next.js App Router pages (swap, vaults, wallet, activity, admin)
- `hooks/` — mutations (useSwapMutation, useAddLiquidityMutation, etc.) + data hooks
- `context/` — AlkanesSDKContext (WASM), WalletContext (keystore+browser), ThemeContext, TransactionConfirmContext, NotificationContext
- `queries/` — React-Query options factories (height, pools, account, positions, vaults)
- `lib/alkanes/` — builders.ts, constants.ts, helpers.ts, browserWalletSigning.ts (PSBT patching)
- `constants/` — opcode definitions (FACTORY_OPCODES, POOL_OPCODES, VAULT_OPCODES, FIRE_*_OPCODES)
- `stores/` — Zustand (GlobalStore for network/theme, ModalStore for UI state)
- `e2e-tests/playwright/` — devnet boot, wallet creation smoke tests

## Anti-patterns to flag in review
- Symbolic addresses (`p2tr:0`) in any mutation that targets a browser wallet
- Manually constructed edicts in a two-protostone flow
- New hooks that self-refresh on a timer instead of subscribing to HeightPoller
- Direct pool opcode 3 calls (must route through factory opcode 13)
- Blind dust-UTXO selection in alkane transfers
- Espo queries in regtest paths

## Recently active branches (signal for current pain points)
ts-sdk-perf phases 1-9, fix/peppy-gizmo-three-bugs, fix/devnet-routing-and-boot-completion, feat/wallet-input-builder, perf/mainnet-optimization, feat/okx-wallet-integration, fix/unwrap-cellpack-and-dust-output, feat/single-tx-frbtc-swap, kungfuflex/demo-gate-release.

---

## Recent develop additions (captured 2026-05-23 @ c30de6c3)

Doc body above was originally drafted against an older develop SHA (`6658302d`). The patterns above are all still correct; what follows is additive. See `DELTA-subfrost-app.md` for the full delta.

### Multi-address-type support (commit 87aa1e97, `feat(wallet): allow any address type — drop taproot-only assumption`)
The earlier doc's implicit assumption that all addresses are taproot is no longer true. Wallets now expose:
- Taproot (`bc1p...`, `bcrt1p...`) — both browser and keystore
- Segwit (`bc1q...`, `bcrt1q...`) — browser wallets (Xverse, OKX, UniSat dual-address)
- Legacy (`3...`, `2...`) — Xverse only

Mutations detect the active address type per network. See `context/WalletContext.tsx` for the detection logic.

### Extended protocols (FIRE / Bridges / Fujin / Gauge)
18 new mutation hooks on top of the 6 core AMM mutations:
- `hooks/fire/*` — 9 FIRE staking / bonding / redemption hooks
- `hooks/useBridge*.ts` — 3 cross-chain bridge hooks
- `hooks/useFujin*.ts` — 3 Fujin futures hooks
- `hooks/useGauge*.ts` — 3 gauge / LP staking hooks

All follow the two-protostone pattern via `inputRequirements`. Same rules from section 1-7 apply.

### New wallet adapters
- `lib/wallet/SubfrostMobileAdapter.ts` — native Subfrost mobile app
- `lib/wallet/MobileJsWalletAdapter.ts` — JS-to-mobile bridge

### Wallet-state cache layer
`feat(cache-system): reconstruct /api/wallet-state + harness` plus `feat(wallet-state): port pending-tx chain-spend adjustment`. Centralized wallet state with mempool-aware adjustments.

### Doc reference correction
`WalletContext.tsx:1720-1787` line range is stale (file grew). The Xverse/UniSat direct-signing bypasses still exist; reference them by export (`signWithXverse()`, `signWithOyl()`) instead of line number.
