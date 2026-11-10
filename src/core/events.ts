/** Tiny typed event bus. Add event names to GameEvents as systems appear. */
export interface GameEvents {
  quality: { name: string };
  toast: { text: string };
  footstep: { run: boolean };
}

type Handler<T> = (payload: T) => void;

class EventBus {
  private map = new Map<string, Set<Handler<never>>>();
  on<K extends keyof GameEvents>(name: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.map.get(name);
    if (!set) this.map.set(name, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set.delete(fn as Handler<never>);
  }
  emit<K extends keyof GameEvents>(name: K, payload: GameEvents[K]): void {
    this.map.get(name)?.forEach((fn) => (fn as Handler<GameEvents[K]>)(payload));
  }
}

export const bus = new EventBus();
