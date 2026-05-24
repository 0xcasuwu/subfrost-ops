---
description: Explain the receipt-token ownership model for an Alkanes contract. Show where receipts are minted, where ownership is checked, and where they're burned.
---

# /receipt-explain

For a given contract (or position type), explain:
- Where the receipt token is minted (which opcode, what id scheme)
- How state is bound to the receipt id (storage key shape)
- Where ownership is verified (must be `incoming_alkanes` presence — never `context.caller`)
- Where the receipt is burned / destroyed (on position close)
- Whether the protocol auth token pattern applies for cross-contract handshakes

Useful when:
- Adding a new position-type contract
- Reviewing whether an existing contract's auth model is sound
- Onboarding someone who's thinking in Ethereum's `msg.sender` model

## Required skills
- `receipt-model`, `three-phase-init`
