import { SnitchDesk } from '@snitchdesk/sdk'

const token = process.env.TOKEN
if (!token) throw new Error('Set TOKEN to an ERC-20 contract address on Robinhood Chain')

// A private RPC avoids the rate limits of the public endpoint.
const desk = new SnitchDesk({ rpcUrl: process.env.RPC_URL })

const agent = desk.agent({
  name: 'Whale Hunter',
  strategy: 'whale',
  token,
  trigger: 250_000, // tokens in a single transfer
  every: 30,
})

agent.on('report', (r) => {
  const { txHash } = r.data as { txHash: string }
  console.log(`${r.title}\n  https://rh-scan.com/tx/${txHash}`)
})
agent.on('error', (err) => console.error(err.message))

agent.start()
