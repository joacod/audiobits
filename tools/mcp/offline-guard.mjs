// Protocol test preload only. Ordinary operations must succeed with fetch denied.
globalThis.fetch = () => {
  throw new Error("Network is disabled for offline protocol verification.");
};
