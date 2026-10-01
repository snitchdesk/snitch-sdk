import { SnitchDeskError } from './errors.js'
import { decodeString, decodeUint, type RpcClient } from './rpc.js'
import type { Report } from './types.js'

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
const SYMBOL = '0x95d89b41'
const DECIMALS = '0x313ce567'
const MAX_SPAN = 20_000n

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`
const fmtAmount = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n >= 1000 ? 0 : 4 })
const topicToAddress = (t: string) => `0x${t.slice(-40)}`

export class WhaleWatcher {
  private cursor: bigint | null = null
  private meta: Promise<{ symbol: string; decimals: number }> | null = null

  constructor(
    private readonly rpc: RpcClient,
    private readonly token: string,
    private readonly lookback: bigint,
  ) {}

  private loadMeta() {
    this.meta ??= Promise.all([this.rpc.call(this.token, SYMBOL), this.rpc.call(this.token, DECIMALS)])
      .then(([s, d]) => ({ symbol: decodeString(s) || 'TOKEN', decimals: Number(decodeUint(d)) }))
      .catch(() => ({ symbol: 'TOKEN', decimals: 18 }))
    return this.meta
  }

  async check(trigger: number): Promise<Omit<Report, 'agent' | 'strategy' | 'ts'>[]> {
    const latest = await this.rpc.blockNumber()
    if (this.cursor === null) this.cursor = latest > this.lookback ? latest - this.lookback : 0n
    if (this.cursor > latest) return []

    const from = this.cursor
    const to = latest - from > MAX_SPAN ? from + MAX_SPAN : latest
    let logs
    try {
      logs = await this.rpc.getLogs({ address: this.token, fromBlock: from, toBlock: to, topics: [TRANSFER_TOPIC] })
    } catch (err) {
      throw err instanceof SnitchDeskError ? err : new SnitchDeskError('Could not read transfer logs', { cause: err })
    }
    this.cursor = to + 1n

    const meta = await this.loadMeta()
    const scale = 10 ** meta.decimals
    const out: Omit<Report, 'agent' | 'strategy' | 'ts'>[] = []
    for (const log of logs) {
      // ERC-721 transfers share the topic but carry the id as a 4th topic.
      if (log.topics.length !== 3) continue
      const amount = Number(BigInt(log.data)) / scale
      if (!(amount >= trigger)) continue
      const from = topicToAddress(log.topics[1] ?? '')
      const to = topicToAddress(log.topics[2] ?? '')
      out.push({
        key: `${log.transactionHash}:${log.logIndex}`,
        level: amount >= trigger * 5 ? 'alert' : 'warn',
        title: `${fmtAmount(amount)} ${meta.symbol} moved from ${short(from)} to ${short(to)}`,
        advice:
          'Large holders are shifting supply. If it lands on an exchange or a pool it can be sell pressure, if it goes to a fresh wallet it can be accumulation. This is a signal, not financial advice.',
        data: { token: this.token, from, to, amount, txHash: log.transactionHash, block: BigInt(log.blockNumber).toString() },
      })
    }
    return out
  }
}
