# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). While the version is below 1.0, minor
releases may include breaking changes.

## [Unreleased]

## [0.1.0] - 2026-10-02

First public release.

### Added
- `SnitchDesk` entry point with `agent()`, `tickers()` and `chat()`.
- `Agent` with `start()`, `stop()`, `runOnce()` and `report`, `tick`, `error` events.
- Strategies: `momentum`, `volatility`, `volume` and `whale`.
- Report cooldown so the same signal does not fire repeatedly.
- `ChatClient` for the SnitchDesk server, with wallet-signature sign-in.
- ESM and CommonJS builds with type declarations.

[Unreleased]: https://github.com/snitchdesk/snitch-sdk/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/snitchdesk/snitch-sdk/releases/tag/v0.1.0
