import { SnitchDesk } from '@snitchdesk/sdk'

// signMessage can come from any wallet library. With viem it looks like this:
//   const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`)
//   await chat.signIn(account.address, (message) => account.signMessage({ message }))
// Keep keys in the environment, never in the source.
declare const wallet: { address: string; signMessage: (message: string) => Promise<string> }

const desk = new SnitchDesk()
const chat = desk.chat({ baseUrl: 'https://api.snitchdesk.cc' })

await chat.signIn(wallet.address, wallet.signMessage)

const answer = await chat.ask('You are Night Watch, a dry market-watching robot. Keep it under 60 words.', [
  { role: 'user', text: 'BTC is up 5% today. Should I worry?' },
])
console.log(answer)
