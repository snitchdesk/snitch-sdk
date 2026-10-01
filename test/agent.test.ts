import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SnitchDesk, type Report } from '../src/index.js'
import { fakeFetch } from './helpers.js'

const row = { symbol: 'BTCUSDT', lastPrice: '100', priceChangePercent: '7', highPrice: '101', lowPrice: '99', quoteVolume: '1' }

test('start emits report and tick, stop halts the timer', async () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => [row]) })
  const agent = desk.agent({ name: 'a', strategy: 'momentum', markets: ['BTC'], every: 5 })
  const reports: Report[] = []
  agent.on('report', (r) => reports.push(r))
  const tick = new Promise<{ reports: number }>((resolve) => agent.once('tick', resolve))
  agent.start()
  assert.equal(agent.running, true)
  assert.equal((await tick).reports, 1)
  assert.equal(reports[0]?.agent, 'a')
  assert.equal(reports[0]?.strategy, 'momentum')
  agent.stop()
  assert.equal(agent.running, false)
})

test('errors are emitted instead of thrown from the timer', async () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => ({ __status: 500, body: {} })) })
  const agent = desk.agent({ name: 'a', strategy: 'momentum', markets: ['BTC'], every: 5 })
  const err = new Promise<Error>((resolve) => agent.once('error', resolve))
  agent.start()
  assert.match((await err).message, /500/)
  agent.stop()
})

test('start is idempotent and the unsubscribe function works', async () => {
  const desk = new SnitchDesk({ fetch: fakeFetch(() => [row]) })
  const agent = desk.agent({ name: 'a', strategy: 'momentum', markets: ['BTC'], every: 5 })
  let count = 0
  const off = agent.on('tick', () => count++)
  off()
  agent.start().start()
  await new Promise((r) => setTimeout(r, 50))
  agent.stop()
  assert.equal(count, 0)
})
