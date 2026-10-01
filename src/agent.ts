import { Emitter } from './emitter.js'
import { SnitchDeskError } from './errors.js'
import { toSymbol, type MarketClient } from './market.js'
import type { RpcClient } from './rpc.js'
import { DEFAULT_TRIGGER, runMarketStrategy } from './strategies.js'
import type { AgentConfig, Report, StrategyName } from './types.js'
import { WhaleWatcher } from './whale.js'

const STRATEGIES: StrategyName[] = ['momentum', 'volatility', 'volume', 'whale']
const DEFAULT_EVERY = 60
const MIN_EVERY = 5
const DEFAULT_COOLDOWN = 10 * 60_000

export interface AgentEvents extends Record<string, unknown> {
  report: Report
  error: Error
  tick: { at: number; reports: number }
}

export class Agent extends Emitter<AgentEvents> {
  readonly config: Readonly<Required<Pick<AgentConfig, 'name' | 'strategy'>>> & AgentConfig
  private readonly symbols: string[]
  private readonly trigger: number
  private readonly everyMs: number
  private readonly cooldownMs: number
  private readonly seen = new Map<string, number>()
  private readonly whale?: WhaleWatcher
  private timer: ReturnType<typeof setInterval> | null = null
  private busy = false

  constructor(config: AgentConfig, private readonly deps: { market: MarketClient; rpc: RpcClient }) {
    super()
    if (!config || typeof config.name !== 'string' || !config.name.trim()) throw new SnitchDeskError('An agent needs a name')
    if (!STRATEGIES.includes(config.strategy))
      throw new SnitchDeskError(`Unknown strategy "${String(config.strategy)}". Use one of: ${STRATEGIES.join(', ')}`)

    this.trigger = config.trigger ?? DEFAULT_TRIGGER[config.strategy]
    if (!(this.trigger > 0)) throw new SnitchDeskError('trigger must be greater than zero')

    const every = config.every ?? DEFAULT_EVERY
    if (!(every >= MIN_EVERY)) throw new SnitchDeskError(`every must be at least ${MIN_EVERY} seconds`)
    this.everyMs = every * 1000
    this.cooldownMs = config.cooldownMs ?? DEFAULT_COOLDOWN

    if (config.strategy === 'whale') {
      if (!config.token || !/^0x[0-9a-fA-F]{40}$/.test(config.token)) throw new SnitchDeskError('The whale strategy needs a token contract address')
      this.symbols = []
      this.whale = new WhaleWatcher(deps.rpc, config.token, BigInt(config.lookbackBlocks ?? 0))
    } else {
      if (!config.markets?.length) throw new SnitchDeskError(`The ${config.strategy} strategy needs at least one market`)
      this.symbols = [...new Set(config.markets.map(toSymbol))]
    }
    this.config = { ...config, name: config.name.trim() }
  }

  get running(): boolean {
    return this.timer !== null
  }

  /** Run one check now and return the reports that fired (after cooldown filtering). */
  async runOnce(): Promise<Report[]> {
    const { strategy } = this.config
    const drafts = this.whale
      ? await this.whale.check(this.trigger)
      : await runMarketStrategy(strategy as Exclude<StrategyName, 'whale'>, this.symbols, this.trigger, this.deps.market)

    const now = Date.now()
    const fresh: Report[] = []
    for (const d of drafts) {
      const last = this.seen.get(d.key)
      if (last !== undefined && now - last < this.cooldownMs) continue
      this.seen.set(d.key, now)
      fresh.push({ ...d, agent: this.config.name, strategy, ts: now })
    }
    for (const [k, t] of this.seen) if (now - t > this.cooldownMs * 4) this.seen.delete(k)
    return fresh
  }

  start(): this {
    if (this.timer) return this
    const tick = async () => {
      if (this.busy) return
      this.busy = true
      try {
        const reports = await this.runOnce()
        for (const r of reports) this.emit('report', r)
        this.emit('tick', { at: Date.now(), reports: reports.length })
      } catch (err) {
        this.emit('error', err instanceof Error ? err : new SnitchDeskError(String(err)))
      } finally {
        this.busy = false
      }
    }
    void tick()
    this.timer = setInterval(tick, this.everyMs)
    return this
  }

  stop(): this {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    return this
  }
}
