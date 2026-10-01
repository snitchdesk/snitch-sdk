import { SnitchDeskError } from './errors.js'
import type { FetchFn } from './types.js'

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

export interface ChatClientOptions {
  /** Base URL of a SnitchDesk server, e.g. https://api.snitchdesk.cc */
  baseUrl: string
  fetch?: FetchFn
}

/**
 * Talks to the SnitchDesk server. Sign-in uses a wallet signature, so the SDK never sees a private key:
 * you pass in a function that signs a message with whatever wallet library you use.
 */
export class ChatClient {
  private token: { value: string; expiresAt: number } | null = null
  private readonly fetchFn: FetchFn
  private readonly baseUrl: string

  constructor(options: ChatClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.fetchFn = options.fetch ?? globalThis.fetch.bind(globalThis)
  }

  get signedIn(): boolean {
    return !!this.token && this.token.expiresAt > Date.now() + 60_000
  }

  async signIn(address: string, signMessage: (message: string) => Promise<string>): Promise<void> {
    const message = `SnitchDesk sign-in\nAddress: ${address}\nIssued: ${new Date().toISOString()}\nThis signature only logs you in to chat. It does not move funds.`
    const signature = await signMessage(message)
    const res = await this.post<{ token: string; expiresAt: number }>('/auth', { address, message, signature })
    this.token = { value: res.token, expiresAt: res.expiresAt }
  }

  /** Ask for a reply. `system` is the persona and context, `messages` is the conversation so far. */
  async ask(system: string, messages: ChatMessage[]): Promise<string> {
    if (!this.signedIn || !this.token) throw new SnitchDeskError('Not signed in. Call signIn() first.', { status: 401 })
    const res = await this.post<{ text: string }>('/chat', { system, messages }, this.token.value)
    return res.text
  }

  private async post<T>(path: string, body: unknown, token?: string): Promise<T> {
    let res: Response
    try {
      res = await this.fetchFn(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      })
    } catch (cause) {
      throw new SnitchDeskError('Could not reach the SnitchDesk server', { cause })
    }
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (res.status === 401) this.token = null
    if (!res.ok) throw new SnitchDeskError(data.error ?? `Request failed (${res.status})`, { status: res.status })
    return data as T
  }
}
