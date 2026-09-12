const running = new Set<string>();

// Independent services must not delay collection or overlap with themselves.
export function runBackgroundTask(name: string, task: () => unknown | Promise<unknown>): void {
  if (running.has(name)) return;
  running.add(name);
  void Promise.resolve().then(task).catch((error) => {
    console.error(`[${name}] Failed; other collection services continue:`, error instanceof Error ? error.message : "Unknown error");
  }).finally(() => running.delete(name));
}
