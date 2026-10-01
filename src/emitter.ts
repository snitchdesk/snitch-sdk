type Handler<T> = (payload: T) => void

export class Emitter<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<never>>>()

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const set = this.handlers.get(event) ?? new Set()
    set.add(handler as Handler<never>)
    this.handlers.set(event, set)
    return () => this.off(event, handler)
  }

  once<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    const off = this.on(event, (payload) => {
      off()
      handler(payload)
    })
    return off
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<never>)
  }

  protected emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const handler of [...(this.handlers.get(event) ?? [])]) {
      try {
        ;(handler as Handler<Events[K]>)(payload)
      } catch (err) {
        // A broken listener must not stop the agent.
        queueMicrotask(() => {
          throw err
        })
      }
    }
  }
}
