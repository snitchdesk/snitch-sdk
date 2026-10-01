import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SnitchDesk } from '../src/index.js'
import { abiString, addrTopic, fakeFetch, pad32 } from './helpers.js'

const TOKEN = '0x1111111111111111111111111111111111111111'
const A = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const B = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

function rpc(logs: unknown[], block = '0x64') {
  const calls: { method: string; params: unknown[] }[] = []
  const f = fakeFetch((_url, init) => {
    const { method, params, id } = JSON.parse(String(init?.body))
    calls.push({ method, params })
    let result: unknown
    if (method === 'eth_blockNumber') result = block
    else if (method === 'eth_getLogs') result = logs
    else if (method === 'eth_call') result = (params[0] as { data: string }).data === '0x95d89b41' ? abiString('SNITCH') : `0x${pad32('12')}`
    return { jsonrpc: '2.0', id, result }
  })
  return { f, calls }
}

const log = (amountTokens: bigint, hash: string, topics = [TRANSFER, addrTopic(A), addrTopic(B)]) => ({
  address: TOKEN, topics, data: `0x${pad32((amountTokens * 10n ** 18n).toString(16))}`,
  blockNumber: '0x63', transactionHash: hash, logIndex: '0x1',
})

test('reports transfers above the trigger with decoded symbol and amount', async () => {
  const { f } = rpc([log(500_000n, '0xabc'), log(10n, '0xdef')])
  const desk = new SnitchDesk({ fetch: f })
  const agent = desk.agent({ name: 'w', strategy: 'whale', token: TOKEN, trigger: 100_000, lookbackBlocks: 10 })
  const reports = await agent.runOnce()
  assert.equal(reports.length, 1)
  assert.equal(reports[0]?.level, 'alert')
  assert.match(reports[0]?.title ?? '', /500,000 SNITCH moved from 0xaaaa…aaaa to 0xbbbb…bbbb/)
  assert.equal(reports[0]?.data?.txHash, '0xabc')
})

test('ignores NFT transfers that reuse the Transfer topic', async () => {
  const { f } = rpc([log(999_999n, '0x1', [TRANSFER, addrTopic(A), addrTopic(B), `0x${pad32('1')}`])])
  const desk = new SnitchDesk({ fetch: f })
  const reports = await desk.agent({ name: 'w', strategy: 'whale', token: TOKEN, trigger: 1, lookbackBlocks: 5 }).runOnce()
  assert.equal(reports.length, 0)
})

test('starts from the latest block and advances the cursor', async () => {
  const { f, calls } = rpc([])
  const desk = new SnitchDesk({ fetch: f })
  const agent = desk.agent({ name: 'w', strategy: 'whale', token: TOKEN })
  await agent.runOnce()
  const first = calls.find((c) => c.method === 'eth_getLogs')?.params[0] as { fromBlock: string; toBlock: string }
  assert.equal(first.fromBlock, '0x64')
  assert.equal(first.toBlock, '0x64')
})
