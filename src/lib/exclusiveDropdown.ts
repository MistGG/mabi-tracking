type OpenListener = (ownerId: string) => void

const listeners = new Set<OpenListener>()

/** Notify all pickers that `ownerId` opened; others should close. */
export function announceDropdownOpen(ownerId: string): void {
  for (const listener of listeners) listener(ownerId)
}

export function onDropdownOpen(listener: OpenListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
