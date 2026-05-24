# DELTA: subfrost-app vs patterns doc (develop tip c30de6c3)

Recorded 2026-05-23 after re-syncing the working tree from a stale shallow clone to develop tip `c30de6c3 Mock Data fire`. Original doc was written against `6658302d`.

## Verdict
**~95% accurate.** Doc remains authoritative for core AMM + wallet patterns. Gaps are additive, not corrective.

## Citations verified intact
- `queries/height.ts:46-47` — `refetchInterval: 10_000`, invalidator predicates at lines 89-90, 115-120 ✅
- `app/providers.tsx:133-169` — provider stack (now extends to ~lines 216-229 with new IndexerSyncProvider, IndexerSyncOverlay, WalletStatePrewarmer)
- `hooks/useSwapMutation.ts:22-84` — symbolic-address fix preserved across all 6 mutation hooks ✅
- `constants/index.ts` — `FACTORY_OPCODES` (L27), `POOL_OPCODES` (L61), `VAULT_OPCODES` (L77), `FIRE_TOKEN_OPCODES` (L97+) ✅
- Factory opcode 13 (SwapExactTokensForTokens) is still the canonical swap path; pool opcode 3 not re-enabled ✅
- Regtest/mainnet pool-collision fix still applied in `useAlkanesTokenPairs.ts` and `usePools.ts` ✅

## Citations that drifted (low severity)
- **`WalletContext.tsx:1720-1787`** — file grew; Xverse/UniSat direct-signing bypasses still exist but at different line numbers. Replace with named references (`signWithXverse()`, `signWithOyl()`) instead of line ranges.

## Material additions on develop NOT yet in doc

1. **Multi-address-type support** (commit `87aa1e97 feat(wallet): allow any address type — drop taproot-only assumption`). Wallets now expose taproot + segwit + legacy; mutations detect address type per network. Implicit "taproot-only" assumption in current doc is outdated but not breaking.

2. **18 new mutation hooks** beyond the 6 core AMM mutations cited:
   - `hooks/fire/*` — 9 FIRE staking / bonding / redemption hooks
   - `hooks/useBridge*.ts` — 3 cross-chain bridge hooks
   - `hooks/useFujin*.ts` — 3 Fujin futures hooks
   - `hooks/useGauge*.ts` — 3 gauge / LP staking hooks
   - All follow the two-protostone pattern via `inputRequirements`

3. **New wallet adapters**:
   - `lib/wallet/SubfrostMobileAdapter.ts` — native Subfrost mobile app integration
   - `lib/wallet/MobileJsWalletAdapter.ts` — JS-to-mobile bridge

4. **Wallet state cache layer** (`feat(cache-system): reconstruct /api/wallet-state + harness`)
5. **Pending-tx chain-spend adjustment** (`feat(wallet-state): port pending-tx chain-spend adjustment`)

## Most-recent commits touching the documented surface
- 4b6f4b04 fix(swap): handle readyToSign envelope for browser-wallet signing path
- 8702dae0 feat(devnet): wLP/LP pool seeding + token resolution + LP swap filter
- c5de48c2 feat(lend): per-action toast labels for all frostlend mutations
- b2df5e22 feat(cache-system): reconstruct /api/wallet-state + harness
- c9b0e3e5 feat(wallet-state): port pending-tx chain-spend adjustment
- ce651ace feat(curated-pools): add DIESEL/ARBUZ pool
- 0a4d2675 fix(add-liquidity): drop legacy alkane-injection workaround
- 87aa1e97 feat(wallet): allow any address type — drop taproot-only assumption

## Recommended actions
1. Replace `WalletContext.tsx:1720-1787` line range with named-export references
2. Add a section "Multi-address-type support (post-2026-03-XX)" noting the taproot-only assumption is gone
3. Add a section "Extended protocols (FIRE / Bridges / Fujin / Gauge)" pointing to the 18 new hook files
4. List `SubfrostMobileAdapter` and `MobileJsWalletAdapter` under wallet adapters
