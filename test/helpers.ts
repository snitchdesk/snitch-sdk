export type Handler = (url: string, init?: RequestInit) => unknown | Promise<unknown>

/** Builds a fake fetch. The handler returns a JSON body, or { __status, body } for a non-200 answer. */
export function fakeFetch(handler: Handler): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const out = (await handler(String(input), init)) as { __status?: number; body?: unknown } | unknown
    const status = (out as { __status?: number })?.__status ?? 200
    const body = (out as { __status?: number })?.__status ? (out as { body?: unknown }).body : out
    return new Response(JSON.stringify(body ?? {}), { status, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
}

export const pad32 = (hex: string) => hex.replace(/^0x/, '').padStart(64, '0')
export const addrTopic = (a: string) => `0x${pad32(a)}`
export const abiString = (s: string) => {
  const bytes = Buffer.from(s, 'utf8').toString('hex')
  return `0x${pad32('20')}${pad32(s.length.toString(16))}${bytes.padEnd(Math.ceil(bytes.length / 64) * 64, '0')}`
}
