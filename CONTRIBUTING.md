# Contributing

Thanks for taking the time. This is a small library, so the process is small too.

## Before you start

For anything bigger than a bug fix or a typo, open an issue first and say what you want to change. It saves you from writing code we cannot merge.

## Setup

```bash
git clone https://github.com/snitchdesk/snitch-sdk
cd snitch-sdk
npm install
```

Node 20 or newer.

## Checks

These three have to pass, CI runs them on Node 20 and 22:

```bash
npm run typecheck
npm run build
npm test
```

Tests run against a fake `fetch`, so they need no network and no keys. When you change a strategy or add one, add a test that feeds it fake data and checks the report. There are helpers in `test/helpers.ts`.

## Code style

- TypeScript, strict mode. No `any` unless there is a comment saying why.
- No runtime dependencies. If you think one is needed, open an issue first.
- Keep it working in browsers: use `fetch` and `TextDecoder`, not Node-only APIs like `Buffer` in `src/`.
- Report titles are plain sentences with the numbers in them. Advice text stays short and ends with the "not financial advice" line.
- Public API changes go in `CHANGELOG.md` under Unreleased.

## Adding a strategy

1. Add the name to `StrategyName` in `src/types.ts` and a default trigger in `src/strategies.ts`.
2. Return reports without `agent`, `strategy` or `ts`, the agent fills those in.
3. Give every report a `key` that stays the same for the same situation, that is what the cooldown uses.
4. Document it in the strategies table in the README.

## Pull requests

- Keep them focused, one change per PR.
- Fill in the template, explain why, not only what.
- Do not commit keys, tokens or `.env` files. If you did by accident, tell us and rotate the key.

## Conduct

Be decent to each other. The [Code of Conduct](CODE_OF_CONDUCT.md) applies.
