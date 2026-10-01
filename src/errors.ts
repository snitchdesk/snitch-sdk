export class SnitchDeskError extends Error {
  readonly status?: number

  constructor(message: string, options: { status?: number; cause?: unknown } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'SnitchDeskError'
    this.status = options.status
  }
}
