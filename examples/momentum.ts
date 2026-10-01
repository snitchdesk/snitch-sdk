import { SnitchDesk } from '@snitchdesk/sdk'

const desk = new SnitchDesk()

const agent = desk.agent({
  name: 'Night Watch',
  strategy: 'momentum',
  markets: ['BTC', 'ETH', 'SOL'],
  trigger: 4, // percent move over 24h
  every: 60, // seconds
})

agent.on('report', (r) => {
  console.log(`[${r.level}] ${r.title}`)
  console.log(`  ${r.advice}`)
})
agent.on('error', (err) => console.error('check failed:', err.message))

agent.start()

process.on('SIGINT', () => {
  agent.stop()
  process.exit(0)
})
