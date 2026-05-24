---
name: height-poller-frontend
description: How subfrost-app drives query invalidation from a single block-height poller. All data hooks use staleTime:Infinity and never self-refresh; HeightPoller invalidates them on each new block.
origin: subfrost-ops
---

# HeightPoller Reactivity

## When to use
- Adding a new data hook in subfrost-app (or any Alkanes frontend)
- Reviewing why a hook isn't refreshing
- Reviewing why the UI is over-fetching

## The pattern
Single source of invalidation — `queries/height.ts`. Polls the indexer's block height every ~10s. When the height increases, invalidates the entire React-Query cache **except** queries that would oscillate from indexer load-balancing.

### Per-hook contract
```ts
export function useThing(args) {
    return useQuery({
        queryKey: ['thing', args],
        queryFn: () => fetchThing(args),
        staleTime: Infinity,        // never auto-refresh
        // NO refetchInterval, NO refetchOnWindowFocus tied to a timer
    });
}
```

### HeightPoller invalidator
```ts
// queries/height.ts (paraphrased)
useEffect(() => {
    if (newHeight > prevHeight) {
        queryClient.invalidateQueries({
            predicate: (q) => {
                const key = q.queryKey[0];
                return key !== 'height' && key !== 'frBTC-premium';
                // ^^ skip height itself and any query that would
                // oscillate due to Espo load-balancing
            },
        });
    }
}, [height]);
```

## Why
- Single source of truth: one timer, many queries
- Cache stays warm between blocks (no thrashing)
- Mutations don't need manual invalidation — the next block flushes everything
- Cheap: one height request every 10s, vs N queries each refetching

## What NOT to do
- ❌ `refetchInterval: 5000` on a data hook (competes with HeightPoller, causes oscillation)
- ❌ Manual `queryClient.invalidateQueries(['thing'])` after a mutation (block confirmation does it; manual triggers a race)
- ❌ Polling a chain-derived value from a useEffect (use a React-Query query so HeightPoller covers it)

## Special cases
- **frBTC premium**: skipped in the invalidator because Espo load-balancing makes the value oscillate; needs its own slower poll
- **Mutations**: show pending state until the height bumps; then HeightPoller picks up the new state
- **Mempool-aware UX**: use `pending-tx-store` for the immediate optimistic state; HeightPoller for confirmed truth

## Reference
- `docs/patterns/subfrost-app.md` section 1
- `queries/height.ts:142-153` in subfrost-app
