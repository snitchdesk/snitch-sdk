# @snitchdesk/sdk

A small TypeScript library for building market-watching agents. You describe what an agent should watch and how loud a move has to be before it speaks up. It checks on a timer and emits a report when something crosses the line.

It is the same engine that runs the agents on [snitchdesk.cc](https://snitchdesk.cc), pulled out so you can run it in your own scripts, bots and servers.

Status: 0.1.0. It works and it is tested, but the API may still change before 1.0. It is not on npm yet, install it from GitHub for now.

## Install

```bash
npm install github:snitchdesk/snitch-sdk
```

The package builds itself on install, so git has to be available. Node 20 or newer is required. It has no runtime dependencies and only uses `fetch`, so it also runs in modern browsers.

## A first agent

```ts
import { SnitchDesk } from '@snitchdesk/sdk'

const desk = new SnitchDesk()

const agent = desk.agent({
  name: 'Night Watch',
  strategy: 'momentum',
  markets: ['BTC', 'ETH'],
  trigger: 4,   // percent move over 24h
  every: 60,    // seconds between checks
})

agent.on('report', (r) => console.log(r.level, r.title))
agent.on('error', (err) => console.error(err.message))

agent.start()
```

`start()` runs a check right away and then repeats every `every` seconds. Call `agent.stop()` to end it. If you only want one check, use `await agent.runOnce()`, which returns the reports that fired.

## Strategies

| strategy | watches | `trigger` means | default |
|---|---|---|---|
| `momentum` | `markets` | percent move over 24h, up or down | 4 |
| `volatility` | `markets` | percent gap between the 24h high and low | 6 |
| `volume` | `markets` | latest hour of volume as a multiple of the 24h hourly average | 2.5 |
| `whale` | one ERC-20 `token` | tokens moved in a single transfer | 100000 |

Markets can be written as `BTC`, `btc`, `ETH/USDT` or `SOLUSDT`. They are all turned into USDT pairs.

A report is marked `warn` when the trigger is crossed and `alert` when the value reaches twice the trigger.

## Reports

```ts
interface Report {
  key: string        // stable id, used for de-duplication
  agent: string      // the agent's name
  strategy: 'momentum' | 'volatility' | 'volume' | 'whale'
  level: 'info' | 'warn' | 'alert'
  title: string      // "BTC is up 5.20% in 24h, now $84,634.22"
  advice: string     // a short plain-language suggestion
  ts: number         // unix ms
  data?: Record<string, unknown>
}
```

`data` carries the raw numbers behind the title, so you can build your own message. For whale reports it includes `from`, `to`, `amount` and `txHash`.

The same report key will not fire again for ten minutes. Change that with `cooldownMs`.

## Events

| event | payload |
|---|---|
| `report` | a `Report` |
| `tick` | `{ at, reports }` after every finished check |
| `error` | an `Error`, usually a `SnitchDeskError`. The agent keeps running. |

`on()` returns a function that removes the listener. There is also `once()` and `off()`.

## Watching whales

```ts
const desk = new SnitchDesk({ rpcUrl: process.env.RPC_URL })

desk.agent({
  name: 'Whale Hunter',
  strategy: 'whale',
  token: '0x...',
  trigger: 250_000,
  every: 30,
}).on('report', (r) => console.log(r.title, r.data?.txHash)).start()
```

A few things worth knowing:

- It reads `Transfer` logs from the chain. By default it starts at the latest block, so you only hear about new transfers. Pass `lookbackBlocks` to also look back.
- The default RPC is the public Robinhood Chain endpoint, which rate limits. For anything long running, pass your own `rpcUrl`.
- NFT transfers use the same event signature and are skipped.
- Token symbol and decimals are read from the contract once. If the contract does not answer, it falls back to `TOKEN` and 18 decimals.

## Talking to an agent

If you run the [SnitchDesk server](https://github.com/idxtechx/snitchdesk), or use ours, you can chat with an agent. Sign-in is a wallet signature, so the SDK never touches a private key. You hand it a function that signs.

```ts
const chat = desk.chat({ baseUrl: 'https://api.snitchdesk.cc' })

await chat.signIn(address, (message) => account.signMessage({ message }))

const reply = await chat.ask('You are Night Watch, a dry market robot. Keep it short.', [
  { role: 'user', text: 'BTC is up 5%. Should I worry?' },
])
```

The session lasts about twelve hours. A `401` clears it and `signedIn` turns false.

## Options

```ts
new SnitchDesk({
  chainId: 4663,                 // Robinhood Chain mainnet, the default
  rpcUrl: 'https://...',         // whale strategy
  marketApiUrl: 'https://...',   // defaults to Binance public market data
  fetch: customFetch,            // defaults to global fetch
})
```

Agent options are `name`, `strategy`, `markets`, `token`, `trigger`, `every` (seconds, minimum 5), `cooldownMs` and `lookbackBlocks`. Bad configuration throws a `SnitchDeskError` when you create the agent, not later on the timer.

## Things it does not do

- It never sends transactions and never asks for keys.
- It does not store anything. Reports live in memory and cooldowns reset when the process restarts.
- The market strategies depend on Binance's public data API. Some regions are blocked, in that case point `marketApiUrl` at a mirror.
- The advice text is a rule of thumb. It is a signal, not financial advice.

## Development

```bash
git clone https://github.com/snitchdesk/snitch-sdk
cd snitch-sdk
npm install
npm test          # runs against mocked network, no keys needed
npm run typecheck
npm run build
```

The examples in `examples/` import the package by name and run with `npx tsx examples/momentum.ts` once it is built or installed.

Bug reports and pull requests are welcome, see [CONTRIBUTING.md](CONTRIBUTING.md). By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md). Security problems go through [SECURITY.md](SECURITY.md).

## License

MIT, see [LICENSE](LICENSE).
