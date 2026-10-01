import { SnitchDeskError } from './errors.js'
import type { FetchFn, Kline, Ticker } from './types.js'

export const DEFAULT_MARKET_API = 'https://data-api.binance.vision/api/v3'

/** "btc" -> "BTCUSDT", "ETH/USDT" -> "ETHUSDT", "SOLUSDT" -> "SOLUSDT". */
export function toSymbol(input: string): string {
  const s = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!s) throw new SnitchDeskError(`Invalid market "${input}"`)
  return s.endsWith('USDT') ? s : `${s}USDT`
}

export class MarketClient {
  constructor(
    private readonly fetchFn: FetchFn,
    private readonly baseUrl: string = DEFAULT_MARKET_API,
  ) {}

  async tickers(symbols: string[]): Promise<Ticker[]> {
    const q = encodeURIComponent(JSON.stringify(symbols))
    const rows = await this.get<Record<string, string>[]>(`/ticker/24hr?symbols=${q}`)
    return rows.map((t) => ({
      symbol: String(t.symbol),
      price: Number(t.lastPrice),
      change24h: Number(t.priceChangePercent),
      high: Number(t.highPrice),
      low: Number(t.lowPrice),
      quoteVolume: Number(t.quoteVolume),
    }))
  }

  async klines(symbol: string, interval = '1h', limit = 25): Promise<Kline[]> {
    const rows = await this.get<(string | number)[][]>(`/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`)
    return rows.map((k) => ({ open: Number(k[1]), close: Number(k[4]), quoteVolume: Number(k[7]) }))
  }

  private async get<T>(path: string): Promise<T> {
    let res: Response
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`)
    } catch (cause) {
      throw new SnitchDeskError('Could not reach the market data API', { cause })
    }
    if (!res.ok) throw new SnitchDeskError(`Market data API returned ${res.status}`, { status: res.status })
    return (await res.json()) as T
  }
}

export const fmtUsd = (n: number): string =>
  n >= 1 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : n.toPrecision(3)
