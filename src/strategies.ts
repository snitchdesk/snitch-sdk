import { fmtUsd, type MarketClient } from './market.js'
import type { Level, Report, StrategyName } from './types.js'

export const DEFAULT_TRIGGER: Record<StrategyName, number> = {
  momentum: 4,
  volatility: 6,
  volume: 2.5,
  whale: 100_000,
}

const NOT_ADVICE = ' This is a signal, not financial advice.'

type Draft = Omit<Report, 'agent' | 'strategy' | 'ts'>

const level = (value: number, trigger: number): Level => (value >= trigger * 2 ? 'alert' : 'warn')

export async function runMarketStrategy(
  strategy: Exclude<StrategyName, 'whale'>,
  symbols: string[],
  trigger: number,
  market: MarketClient,
): Promise<Draft[]> {
  const out: Draft[] = []

  if (strategy === 'momentum' || strategy === 'volatility') {
    for (const t of await market.tickers(symbols)) {
      const coin = t.symbol.replace('USDT', '')
      if (strategy === 'momentum' && Math.abs(t.change24h) >= trigger) {
        const up = t.change24h > 0
        out.push({
          key: `${t.symbol}:momentum`,
          level: level(Math.abs(t.change24h), trigger),
          title: `${coin} is ${up ? 'up' : 'down'} ${Math.abs(t.change24h).toFixed(2)}% in 24h, now $${fmtUsd(t.price)}`,
          advice: up
            ? `A move this stretched tends to cool off. If you want in, scale in slowly or wait for a pullback.${NOT_ADVICE}`
            : `Buying into a fast drop is hard to time. Let the selling settle first and protect any open positions.${NOT_ADVICE}`,
          data: { symbol: t.symbol, price: t.price, change24h: t.change24h },
        })
      }
      const range = ((t.high - t.low) / t.low) * 100
      if (strategy === 'volatility' && range >= trigger) {
        out.push({
          key: `${t.symbol}:volatility`,
          level: level(range, trigger),
          title: `${coin} swung ${range.toFixed(1)}% between its 24h high and low`,
          advice: `Prices are moving a lot. Use smaller size and wider stops, or sit out until the range tightens.${NOT_ADVICE}`,
          data: { symbol: t.symbol, price: t.price, range },
        })
      }
    }
    return out
  }

  for (const symbol of symbols) {
    const k = await market.klines(symbol, '1h', 25)
    const last = k[k.length - 1]
    const prev = k.slice(0, -1)
    if (!last || prev.length === 0) continue
    const avg = prev.reduce((sum, x) => sum + x.quoteVolume, 0) / prev.length
    if (avg <= 0) continue
    const ratio = last.quoteVolume / avg
    if (ratio >= trigger) {
      const dir = last.close >= last.open ? 'up' : 'down'
      out.push({
        key: `${symbol}:volume`,
        level: level(ratio, trigger),
        title: `${symbol.replace('USDT', '')} volume is ${ratio.toFixed(1)}x its 24h average, price is ${dir} this hour`,
        advice: `Someone large is active. See if price holds the ${dir === 'up' ? 'breakout' : 'breakdown'} before acting.${NOT_ADVICE}`,
        data: { symbol, ratio, direction: dir },
      })
    }
  }
  return out
}
