import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SnitchDesk, SnitchDeskError, toSymbol } from '../src/index.js'
import { fakeFetch } from './helpers.js'

const ticker = (symbol: string, pct: string, price = '100', high = '110', low = '90') => ({
  symbol, lastPrice: price, priceChangePercent: pct, highPrice: high, lowPrice: low, quoteVolume: '1000000',
})

test('toSymbol normalises input', () => {
  assert.equal(toSymbol('btc'), 'BTCUSDT')
  assert.equal(toSymbol('ETH/USDT'), 'ETHUSDT')
  assert.equal(toSymbol('SOLUSDT'), 'SOLUSDT')
  assert.throws(() => toSymbol('  '), SnitchDeskError)
})

test('momentum fires above the trigger and stays quiet below it', async () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => [ticker('BTCUSDT', '5.2'), ticker('ETHUSDT', '1.1')]) })
  const agent = desk.agent({ name: 'm', strategy: 'momentum', markets: ['BTC', 'ETH'], trigger: 4 })
  const reports = await agent.runOnce()
  assert.equal(reports.length, 1)
  assert.equal(reports[0]?.key, 'BTCUSDT:momentum')
  assert.equal(reports[0]?.level, 'warn')
  assert.match(reports[0]?.title ?? '', /BTC is up 5\.20%/)
})

test('momentum escalates to alert at twice the trigger and reports drops', async () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => [ticker('SOLUSDT', '-9.5')]) })
  const [r] = await desk.agent({ name: 'm', strategy: 'momentum', markets: ['SOL'], trigger: 4 }).runOnce()
  assert.equal(r?.level, 'alert')
  assert.match(r?.title ?? '', /down 9\.50%/)
})

test('volatility looks at the 24h range', async () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => [ticker('BTCUSDT', '0.5', '100', '120', '100')]) })
  const [r] = await desk.agent({ name: 'v', strategy: 'volatility', markets: ['BTC'], trigger: 6 }).runOnce()
  assert.equal(r?.key, 'BTCUSDT:volatility')
  assert.match(r?.title ?? '', /20\.0%/)
})

test('volume compares the latest hour with the average', async () => {
  const kline = (vol: number, open = 100, close = 101) => [0, String(open), '0', '0', String(close), '0', 0, String(vol)]
  const rows = [...Array(24).fill(0).map(() => kline(1000)), kline(4000)]
  const desk = new SnitchDesk({ fetch: fakeFetch(() => rows) })
  const [r] = await desk.agent({ name: 'v', strategy: 'volume', markets: ['BTC'], trigger: 2.5 }).runOnce()
  assert.equal(r?.key, 'BTCUSDT:volume')
  assert.match(r?.title ?? '', /4\.0x/)
})

test('cooldown suppresses repeats of the same report', async () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => [ticker('BTCUSDT', '6')]) })
  const agent = desk.agent({ name: 'm', strategy: 'momentum', markets: ['BTC'], cooldownMs: 60_000 })
  assert.equal((await agent.runOnce()).length, 1)
  assert.equal((await agent.runOnce()).length, 0)
})

test('desk.tickers returns parsed numbers', async () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => [ticker('BTCUSDT', '1.5', '85000')]) })
  const [t] = await desk.tickers(['btc'])
  assert.equal(t?.price, 85000)
  assert.equal(t?.change24h, 1.5)
})

test('market API failures become SnitchDeskError', async () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => ({ __status: 451, body: {} })) })
  const agent = desk.agent({ name: 'm', strategy: 'momentum', markets: ['BTC'] })
  await assert.rejects(agent.runOnce(), (e: unknown) => e instanceof SnitchDeskError && e.status === 451)
})

test('config is validated up front', () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => []) })
  assert.throws(() => desk.agent({ name: '', strategy: 'momentum', markets: ['BTC'] }), /needs a name/)
  assert.throws(() => desk.agent({ name: 'a', strategy: 'nope' as never, markets: ['BTC'] }), /Unknown strategy/)
  assert.throws(() => desk.agent({ name: 'a', strategy: 'momentum' }), /at least one market/)
  assert.throws(() => desk.agent({ name: 'a', strategy: 'momentum', markets: ['BTC'], every: 1 }), /at least 5 seconds/)
  assert.throws(() => desk.agent({ name: 'a', strategy: 'momentum', markets: ['BTC'], trigger: 0 }), /greater than zero/)
  assert.throws(() => desk.agent({ name: 'a', strategy: 'whale', token: '0x123' }), /token contract/)
})
