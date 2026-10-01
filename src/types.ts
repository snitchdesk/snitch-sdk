export type StrategyName = 'momentum' | 'volatility' | 'volume' | 'whale'
export type Level = 'info' | 'warn' | 'alert'

export interface Report {
  /** Stable id for de-duplication, e.g. "BTCUSDT:momentum" or a transaction hash. */
  key: string
  agent: string
  strategy: StrategyName
  level: Level
  title: string
  advice: string
  /** Unix time in milliseconds. */
  ts: number
  /** Extra structured data, depends on the strategy. */
  data?: Record<string, unknown>
}

export interface AgentConfig {
  name: string
  strategy: StrategyName
  /** Coins to watch, e.g. ["BTC", "ETH"] or ["BTCUSDT"]. Not used by the whale strategy. */
  markets?: string[]
  /** ERC-20 contract to watch. Only used by the whale strategy. */
  token?: string
  /**
   * When the agent should speak up. Meaning depends on the strategy:
   * momentum: percent move over 24h, volatility: percent high/low range,
   * volume: multiple of the 24h average hourly volume, whale: tokens in a single transfer.
   */
  trigger?: number
  /** Seconds between checks. Default 60, minimum 5. */
  every?: number
  /** Minimum time before the same report key can fire again, in ms. Default 10 minutes. */
  cooldownMs?: number
  /** Whale only: how many blocks to look back on the first check. Default 0 (start from now). */
  lookbackBlocks?: number
}

export interface SnitchDeskOptions {
  /** Default 4663 (Robinhood Chain mainnet). */
  chainId?: number
  /** JSON-RPC endpoint used by the whale strategy. Default is the public Robinhood Chain RPC. */
  rpcUrl?: string
  /** Base URL of the market data API. Default is Binance public market data. */
  marketApiUrl?: string
  /** Custom fetch, handy for tests or older runtimes. Defaults to the global fetch. */
  fetch?: typeof fetch
}

export interface Ticker {
  symbol: string
  price: number
  change24h: number
  high: number
  low: number
  quoteVolume: number
}

export interface Kline {
  open: number
  close: number
  quoteVolume: number
}

export type FetchFn = typeof fetch
