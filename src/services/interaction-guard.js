export function createInteractionGuard(ttlMs = 15 * 60 * 1000) {
  const handled = new Set();
  return {
    claim(interactionId) {
      if (handled.has(interactionId)) return false;
      handled.add(interactionId);
      const timer = setTimeout(() => handled.delete(interactionId), ttlMs);
      timer.unref?.();
      return true;
    },
  };
}
