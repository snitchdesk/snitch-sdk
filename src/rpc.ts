import { SnitchDeskError } from './errors.js'
import type { FetchFn } from './types.js'

export const ROBINHOOD_CHAIN = {
  id: 4663,
  name: 'Robinhood Chain',
  rpcUrl: 'https://rpc.mainnet.chain.robinhood.com',
  explorer: 'https://rh-scan.com',
} as const

export interface RpcLog {
  address: string
  topics: string[]
  data: string
  blockNumber: string
  transactionHash: string
  logIndex: string
}

export class RpcClient {
  private nextId = 1

  constructor(
    private readonly fetchFn: FetchFn,
    readonly url: string,
  ) {}

  async request<T>(method: string, params: unknown[] = []): Promise<T> {
    let res: Response
    try {
      res = await this.fetchFn(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: this.nextId++, method, params }),
      })
    } catch (cause) {
      throw new SnitchDeskError('Could not reach the RPC endpoint', { cause })
    }
    if (res.status === 429) throw new SnitchDeskError('The RPC endpoint is rate limiting requests', { status: 429 })
    if (!res.ok) throw new SnitchDeskError(`RPC returned ${res.status}`, { status: res.status })
    const body = (await res.json()) as { result?: T; error?: { message?: string } }
    if (body.error) throw new SnitchDeskError(`RPC error: ${body.error.message ?? 'unknown'}`)
    return body.result as T
  }

  async blockNumber(): Promise<bigint> {
    return BigInt(await this.request<string>('eth_blockNumber'))
  }

  getLogs(filter: { address: string; fromBlock: bigint; toBlock: bigint; topics: (string | null)[] }): Promise<RpcLog[]> {
    return this.request<RpcLog[]>('eth_getLogs', [
      { address: filter.address, topics: filter.topics, fromBlock: toHex(filter.fromBlock), toBlock: toHex(filter.toBlock) },
    ])
  }

  call(to: string, data: string): Promise<string> {
    return this.request<string>('eth_call', [{ to, data }, 'latest'])
  }
}

export const toHex = (n: bigint): string => `0x${n.toString(16)}`

/** Decode an ABI encoded `string` return value. Falls back to bytes32 for older tokens. */
export function decodeString(hex: string): string {
  const raw = hex.startsWith('0x') ? hex.slice(2) : hex
  if (raw.length === 64) return utf8(raw).replace(/\0+$/, '')
  if (raw.length < 128) return ''
  const offset = Number(BigInt(`0x${raw.slice(0, 64)}`)) * 2
  const len = Number(BigInt(`0x${raw.slice(offset, offset + 64)}`)) * 2
  return utf8(raw.slice(offset + 64, offset + 64 + len))
}

function utf8(hex: string): string {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return new TextDecoder().decode(out)
}

export const decodeUint = (hex: string): bigint => (hex === '0x' || hex === '' ? 0n : BigInt(hex))
