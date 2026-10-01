import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SnitchDesk, SnitchDeskError } from '../src/index.js'
import { fakeFetch } from './helpers.js'

test('sign in then ask sends the token and returns the text', async () => {
  const seen: { url: string; auth?: string; body?: unknown }[] = []
  const f = fakeFetch((url, init) => {
    const headers = (init?.headers ?? {}) as Record<string, string>
    seen.push({ url, auth: headers.Authorization, body: JSON.parse(String(init?.body)) })
    return url.endsWith('/auth') ? { token: 'tok', expiresAt: Date.now() + 3_600_000 } : { text: 'hello from the desk' }
  })
  const chat = new SnitchDesk({ fetch: f }).chat({ baseUrl: 'https://api.example.com/' })
  assert.equal(chat.signedIn, false)
  await chat.signIn('0xabc', async (message) => {
    assert.match(message, /^SnitchDesk sign-in\nAddress: 0xabc\nIssued: /)
    return '0xsig'
  })
  assert.equal(chat.signedIn, true)
  assert.equal(await chat.ask('be brief', [{ role: 'user', text: 'hi' }]), 'hello from the desk')
  assert.equal(seen[0]?.url, 'https://api.example.com/auth')
  assert.equal(seen[1]?.auth, 'Bearer tok')
})

test('ask before sign in fails with a clear error', async () => {
  const chat = new SnitchDesk({ fetch: fakeFetch(() => ({})) }).chat({ baseUrl: 'https://x.test' })
  await assert.rejects(chat.ask('s', [{ role: 'user', text: 'hi' }]), (e: unknown) => e instanceof SnitchDeskError && e.status === 401)
})

test('a 401 from the server clears the session', async () => {
  let n = 0
  const f = fakeFetch((url) => {
    if (url.endsWith('/auth')) return { token: 't', expiresAt: Date.now() + 3_600_000 }
    n++
    return { __status: 401, body: { error: 'Sign in again' } }
  })
  const chat = new SnitchDesk({ fetch: f }).chat({ baseUrl: 'https://x.test' })
  await chat.signIn('0xabc', async () => '0xsig')
  await assert.rejects(chat.ask('s', [{ role: 'user', text: 'hi' }]), /Sign in again/)
  assert.equal(chat.signedIn, false)
  assert.equal(n, 1)
})
