import { Agent } from './agent.js'
import { ChatClient, type ChatClientOptions } from './chat.js'
import { MarketClient, DEFAULT_MARKET_API, toSymbol } from './market.js'
import { ROBINHOOD_CHAIN, RpcClient } from './rpc.js'
import type { AgentConfig, SnitchDeskOptions, Ticker } from './types.js'

export class SnitchDesk {
  readonly chainId: number
  private readonly market: MarketClient
  private readonly rpc: RpcClient
  private readonly fetchFn: typeof fetch

  constructor(options: SnitchDeskOptions = {}) {
    this.chainId = options.chainId ?? ROBINHOOD_CHAIN.id
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.market = new MarketClient(this.fetchFn, options.marketApiUrl ?? DEFAULT_MARKET_API)
    this.rpc = new RpcClient(this.fetchFn, options.rpcUrl ?? ROBINHOOD_CHAIN.rpcUrl)
  }

  /** Create an agent. It does nothing until you call start() or runOnce(). */
  agent(config: AgentConfig): Agent {
    return new Agent(config, { market: this.market, rpc: this.rpc })
  }

  /** One-off 24h ticker lookup, e.g. desk.tickers(["BTC", "ETH"]). */
  tickers(markets: string[]): Promise<Ticker[]> {
    return this.market.tickers(markets.map(toSymbol))
  }

  /** Client for the SnitchDesk server (wallet sign-in and agent chat). */
  chat(options: Omit<ChatClientOptions, 'fetch'>): ChatClient {
    return new ChatClient({ ...options, fetch: this.fetchFn })
  }
}

export { Agent } from './agent.js'
export { ChatClient } from './chat.js'
export type { ChatClientOptions, ChatMessage } from './chat.js'
export { SnitchDeskError } from './errors.js'
export { toSymbol } from './market.js'
export { ROBINHOOD_CHAIN } from './rpc.js'
export { DEFAULT_TRIGGER } from './strategies.js'
export type {
  AgentConfig,
  Kline,
  Level,
  Report,
  SnitchDeskOptions,
  StrategyName,
  Ticker,
} from './types.js'
export type { AgentEvents } from './agent.js'
