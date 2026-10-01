# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private reporting instead: open the **Security** tab of this repository and choose **Report a vulnerability**. Only the maintainers can read it.

Include what you found, how to reproduce it, and which version you tested. We will reply as soon as we can and keep you updated until it is fixed. If you want to be credited in the release notes, say so.

## What counts

The SDK makes network requests to a market data API, to a JSON-RPC endpoint you choose, and optionally to a SnitchDesk server. Things we want to hear about include:

- a way to make the SDK leak a token or signature it should not
- unsafe handling of data coming back from those endpoints
- a problem in the wallet sign-in message flow of the chat client

The SDK never sends transactions and never handles private keys. If you find code that does, that is a bug, please report it.

## Supported versions

Only the latest release gets fixes while the library is below 1.0.
