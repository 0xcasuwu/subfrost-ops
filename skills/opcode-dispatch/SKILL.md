---
name: opcode-dispatch
description: How Alkanes contracts route cellpack messages to handlers via `#[derive(MessageDispatch)]`. State-changing opcodes use 0-89; view/read opcodes 90+. Each handler is a Rust method on the contract.
origin: subfrost-ops
---

# Opcode Dispatch

## When to use
- Writing a new contract opcode
- Adding an opcode to an existing contract
- Reviewing dispatch coverage

## The pattern

```rust
#[derive(MessageDispatch)]
enum MyContractMessage {
    #[opcode(0)]
    Init {},

    #[opcode(1)]
    Deposit { amount: u128 },

    #[opcode(2)]
    Withdraw { amount: u128 },

    // ... state-changing opcodes 3..89

    #[opcode(99)]
    #[returns(u128)]
    BalanceOf { owner: u128 },

    // ... view opcodes 90+
}

impl AlkaneResponder for MyContract {
    type Message = MyContractMessage;

    fn execute(&self, ctx: Context, msg: Self::Message) -> Result<CallResponse> {
        match msg {
            MyContractMessage::Init {} => self.init(&ctx),
            MyContractMessage::Deposit { amount } => self.deposit(&ctx, amount),
            MyContractMessage::Withdraw { amount } => self.withdraw(&ctx, amount),
            MyContractMessage::BalanceOf { owner } => self.balance_of(owner),
        }
    }
}
```

## Conventions
- **Opcode 0** is always `init` (see `three-phase-init` skill)
- **0-89** = state-changing handlers
- **90+** = view / read-only handlers
- Each handler takes a typed args struct (the derive generates field decoding)
- Handlers return `Result<CallResponse>` for state-changing, `Result<T>` for views (with `#[returns(T)]`)

## What to check
- Every variant in the enum has a matching `match` arm (rust enforces this — but don't bypass with `_ =>`)
- No silent `_ => Ok(())` fall-through
- Inputs validated before indexing — if opcode expects 3 args, derive will fail on 2; but if you take a Vec<u128>, you must bounds-check
- View functions don't call `self.call()` or mutate storage

## Common mistakes
- Putting a state-changing handler in the 90+ range — caller may invoke via staticcall and silently fail
- Reusing an opcode number after refactoring — clients pinned to the old code dispatch to the wrong handler
- Forgetting `init` check in non-init handlers — see three-phase-init

## Reference
- `docs/patterns/alkanes-rs.md` — `__execute()` dispatch macro section
- `docs/patterns/contracts-frost-boiler-fujin.md`
- flashcard decks "Factory Opcodes", "Pool Opcodes"
